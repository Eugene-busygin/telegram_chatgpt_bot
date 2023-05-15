require('dotenv').config();

const Replicate = require('replicate').default;

// import midjourney from "midjourney-client"
const { Telegraf, Markup } = require('telegraf');
const { Configuration, OpenAIApi } = require("openai");
const constants = require('./constants');

// GPT
const config = new Configuration({
    apiKey: process.env.GPT_TOKEN,
});
const openai = new OpenAIApi(config);
let gptHistory = [];


// TELEGRAM
const bot = new Telegraf(process.env.BOT_TOKEN);

// Replicate
// const replicate = new Replicate({
//     auth: process.env.REPLICATE_API_TOKEN,
// });

let savedChats = {};

const createBotButton = (text, callbackId) => {
    return Markup.button.callback(text, callbackId);
}

// DEFAULT
bot.help((ctx) => {
    ctx.reply(constants.BOT_CHAT_COMMANDS);
});

bot.start( async (ctx) => {
    const chatId = ctx.message.chat.id;
    savedChats = {};
    gptHistory = [];

    if (!savedChats[chatId]) {
        savedChats[chatId] = {
            gptType: constants.GPT_TYPE.default,
        };
    }
    try {
        await ctx.reply(`Приветствую Вас ${ctx.message.from.first_name ? ctx.message.from.first_name : 'гость'} в чате!`);
    } catch(e) {
        await ctx.telegram.sendMessage(chatId,
            `Что то пошло не так.. Пожалуйста, перезапустите бота`,
            Markup.inlineKeyboard(
                [
                    [createBotButton('Перезапустить', 'is_restart')],
                ]
            )
        );
        console.error(e);
    }
});

// AUTH
bot.command('auth', async (ctx) => {
    const chatId = ctx.message.chat.id;
    if (savedChats[chatId]) {
        await ctx.reply(`Вы уже авторизованы в чате!`);
        return;
    }
    // sendGpt(chatId);
});

// GPT
bot.command('gpt_type', (ctx) => {
    const chatId = ctx.message.chat.id;
    choiceTypeGpt(chatId)
});

// CHOICE TYPE GPT
const choiceTypeGpt = async (chatId) => {
    const defaultCatigories = [];
    defaultCatigories.push(createBotButton('Обычный', 'default_type_gpt'));
    defaultCatigories.push(createBotButton('Диалог', 'dialog_type_gpt'));
    defaultCatigories.push(createBotButton('Изображение', 'image_type_gpt'));
    // defaultCatigories.push(createBotButton('Изображение профи', 'image_profi_type_gpt'));
    await bot.telegram.sendMessage(chatId,
        `Выбран режим: "${savedChats[chatId].gptType.name} ✔". Выберите новый режим`,
        Markup.inlineKeyboard(
            [
                defaultCatigories
            ]
        )
    );

}

const reloadGptHistory = async (chatId) => {
    gptHistory = [];
    await bot.telegram.sendMessage(chatId, 'Диалог сброшен.');
}

const saveCurrentMsgToGpt = async (chatId, type) => {
    if (type) {
        savedChats[chatId].gptType = type;
        await bot.telegram.sendMessage(chatId, 'Тип выбран, слушаю');
    } else {
        savedChats[chatId].gptType = constants.GPT_TYPE.default;
        await bot.telegram.sendMessage(chatId, 'Тип не выбран.');
    }
}

const answerGpt = async (chatId, text) => {
    if (!savedChats[chatId].gptType) {
        await bot.telegram.sendMessage(chatId, 'Тип не выбран.');
        return;
    }
    const type = savedChats[chatId].gptType.type;

    let answer = "Ничего не понятно..";
    let result = null;
    let typeAnswer = null;

    switch(type) {
        case constants.GPT_TYPE.dialog.type:
            gptHistory.push({role: "user", content: text})
            typeAnswer = 'text';
            result = await openai.createChatCompletion({
                model: constants.GPT_MODELS.turbo,
                // messages: [{role: "user", content: text}],
                messages: gptHistory,
            });
            answer = result.data.choices[0].message.content;
            break;
        case constants.GPT_TYPE.default.type:
            gptHistory = [];
            typeAnswer = 'text';
            result = await openai.createCompletion({
                max_tokens: 2000,
                model: constants.GPT_MODELS.text,
                prompt: text,
                temperature: 0.5,
            });
            answer = result.data.choices[0].text;
            break;
        case constants.GPT_TYPE.image.type:
            gptHistory = [];
            typeAnswer = 'image';
            result = await openai.createImage({
                n: 1,
                prompt: text,
                size: "1024x1024",
            })
            answer = result.data.data[0].url;
        case constants.GPT_TYPE.image.type:
            gptHistory = [];
            typeAnswer = 'image';
            const model = constants.GPT_MODELS['image_replicate'];
            const input = { prompt: text };
            // result = await replicate.run(model, { input });
            // answer = result[0];
            // const res = await midjourney("mdjrny-v4 style a painting of a ginger cat.")
            // await bot.telegram.sendMessage(chatId, res.toString());

    }

    if (result) {
        if (typeAnswer) {
            switch(typeAnswer) {
                case "text":
                    if (type === constants.GPT_TYPE.dialog.type) {
                        const defaultCatigories = [];
                        defaultCatigories.push(createBotButton('Сбросить диалог', 'reload_gpt_dialog'));
                        await bot.telegram.sendMessage(chatId,
                            answer,
                            Markup.inlineKeyboard(
                                [
                                    defaultCatigories
                                ]
                            )
                        );
                    } else {
                        await bot.telegram.sendMessage(chatId, answer);
                    }
                    break;
                case "image":
                    await bot.telegram.sendPhoto(chatId, answer);
                    break;
            }
        }
    } else {
        await bot.telegram.sendMessage(chatId, answer);
    }
}

// TEXT ALL CALL_BACK
bot.on('text', (ctx) => {
    const chatId = ctx.message.chat.id;
    if (savedChats[chatId]) {
        if (savedChats[chatId].gptType) {
            answerGpt(chatId, ctx.message.text)
        }
    }
});

// CHOICE ALL CALL_BACK
bot.on('callback_query', async (ctx) => {
    try {
        const chatId = ctx.update.callback_query.message.chat.id;
        const data = ctx.update.callback_query.data;

        // ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
        await ctx.answerCbQuery();

        let field = null;
        let fieldId = null;

        if (data) {
            field = data.split(':')[0];
            if (data.split(':')[1]) {
                fieldId = data.split(':')[1];
            }
        }

        switch(field) {
            // DEFAULT
            case 'is_restart':
                bot.stop();

            // GPT
            case 'default_type_gpt':
                saveCurrentMsgToGpt(chatId, constants.GPT_TYPE.default);
                break;
            case 'dialog_type_gpt':
                saveCurrentMsgToGpt(chatId, constants.GPT_TYPE.dialog);
                break;    
            case 'image_type_gpt':
                saveCurrentMsgToGpt(chatId, constants.GPT_TYPE.image);
                break;
            case 'image_profi_type_gpt':
                saveCurrentMsgToGpt(chatId, constants.GPT_TYPE.imageProfi);
                break;

            case 'reload_gpt_dialog':
                reloadGptHistory(chatId);
                break;
            // NOTES
            // case 'default_category_for_create_note':
            //     await ctx.reply('Я внимательно слушаю и запоминаю!');
            //     saveCurrentMsgToNote(chatId);
            //     break;
            // case 'default_category_for_get_notes':
            //     await ctx.reply(`Выбрана тема: Без темы.`);
            //     getAllNotes(chatId, null);
            //     break;
            // case 'create_category':
            //     await ctx.reply('Напишите новую тему');
            //     saveCurrentMsgToCreateNewСategoryNote(chatId);
            //     break;
            // case 'category_for_create_note':
            //     savedChats[chatId].noteCategories.forEach(c => {
            //         if (c.id === fieldId) {
            //             note = c;
            //         }
            //     });
            //     if (note) {
            //         await ctx.reply(`Выбрана тема: ${note.name}. Я внимательно слушаю и запоминаю!`);
            //         saveCurrentMsgToNote(chatId, note);
            //     }
            //     break;
            // case 'category_for_get_notes':
            //     savedChats[chatId].noteCategories.forEach(c => {
            //         if (c.id === fieldId) {
            //             note = c;
            //         }
            //     });
            //     if (note) {
            //         await ctx.reply(`Выбрана тема: ${note.name}.`);
            //         getAllNotes(chatId, note.id);
            //     }
            //     break;
                
            default:
                await ctx.reply('Увы, я Вас не понял:(');
        }

    } catch(e) {
        console.error(e);
    }
});


bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));