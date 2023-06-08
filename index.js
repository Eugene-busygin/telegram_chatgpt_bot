require('dotenv').config();

const axios = require('axios');
const request = require('request');

const fs = require('fs');

const constants = require('./constants');

// TELEGRAM
const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

const Replicate = require('replicate').default;

// import midjourney from "midjourney-client"

// GPT
const { Configuration, OpenAIApi } = require("openai");
const config = new Configuration({
    apiKey: process.env.GPT_TOKEN,
});
const openai = new OpenAIApi(config);

// Replicate
// const replicate = new Replicate({
//     auth: process.env.REPLICATE_API_TOKEN,
// });

const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegStatic);

const { Readable, Writable } = require('stream');

const {
    choiceTypeGptDefualtOptions,
    choiceTypeGptDialogOptions,
    choiceTypeGptImageOptions,
    choiceTypeGptAudioOptions,
    choiceTypeGptVideoOptions,
    choiceTypeGptVideoAudioOptions,
    choiceTypeStablediffusionImageOptions,
    againOptions,
    speechOptions,
    speechAndAgainOptions,
    moreOptions,
    emptyOptions,
    moreStablediffusionOptions,
} = require('./options')

const savedChats = {}

let authRequestList = [];
let authUserList = [];

const requestLimitObj = {
    limit: 3,
}
const requestObj = {
    limit: 0,
}

let timerPingId = null;

const createBotButton = (text, callbackId) => {
    return Markup.button.callback(text, callbackId);
}

const pingBot = async () => {
    timerPingId = setInterval(
        () => request(
            process.env.URL,
            () => {
                console.log(`Ping on port ${process.env.PORT}`);
            }
        ), 800000
    );
}

const fileRequest = (bot, chatId, text, fileObj) => {
    if (savedChats[chatId].gptType) {
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.imageStablediffusion.type) {
            answerGpt(bot, chatId, text, fileObj);
        }
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.audio.type) {
            answerGpt(bot, chatId, text, fileObj);
        }
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.video.type) {
            answerGpt(bot, chatId, text, fileObj);
        }
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.video_audio.type) {
            requestGpt(bot, chatId, text, fileObj);
        }
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.dialog.type) {
            answerGpt(bot, chatId, text, fileObj);
        }
    }
}

const botAnswerCallBack = (chatId, callBackId, text) => {
    // bot.answerCallbackQuery(callBackId).then(() => {
    //     bot.sendMessage(chatId, text);
    // });
}

const botEditMsgReplyMarkup = async (bot, chatId, messageId) => {
    let choiceOptions = choiceTypeGptDefualtOptions;
    if (savedChats[chatId].gptType.type === constants.GPT_TYPE.dialog.type) {
        choiceOptions = choiceTypeGptDialogOptions;
    }
    if (savedChats[chatId].gptType.type === constants.GPT_TYPE.image.type) {
        choiceOptions = choiceTypeGptImageOptions;
    }
    if (savedChats[chatId].gptType.type === constants.GPT_TYPE.audio.type) {
        choiceOptions = choiceTypeGptAudioOptions;
    }
    if (savedChats[chatId].gptType.type === constants.GPT_TYPE.video.type) {
        choiceOptions = choiceTypeGptVideoOptions;
    }
    if (savedChats[chatId].gptType.type === constants.GPT_TYPE.video_audio.type) {
        choiceOptions = choiceTypeGptVideoAudioOptions;
    }
    if (savedChats[chatId].gptType.type === constants.GPT_TYPE.imageStablediffusion.type) {
        choiceOptions = choiceTypeStablediffusionImageOptions;
    }
    // bot.editMessageReplyMarkup(choiceOptions.reply_markup, { chat_id: chatId, message_id: messageId });
    bot.editMessageReplyMarkup(chatId, messageId, null, choiceOptions.reply_markup);
    bot.sendMessage(chatId, `${savedChats[chatId].gptType.name} режим выбран, слушаю`);
}

const saveCurrentMsgToGpt = async (bot, chatId, messageId, type) => {
    if (type.type === constants.GPT_TYPE.imageStablediffusion.type) {
        type = constants.GPT_TYPE.image;
        bot.sendMessage(chatId, `В разработке..`);
    }
    // if (type.type === constants.GPT_TYPE.video.type) {
    //     type = constants.GPT_TYPE.default;
    //     bot.sendMessage(chatId, `В разработке..`);
    // }

    if (type) {
        savedChats[chatId].gptType = type;
        botEditMsgReplyMarkup(bot, chatId, messageId);
        // botAnswerCallBack(chatId, callBackId, `${savedChats[chatId].gptType.name} режим выбран, слушаю`);
    } else {
        savedChats[chatId].gptType = constants.GPT_TYPE.default;
        botEditMsgReplyMarkup(bot, chatId, messageId);
        // botAnswerCallBack(chatId, callBackId, `${savedChats[chatId].gptType.name} режим выбран, слушаю`);
    }
}

const reloadGptHistory = async (bot, chatId, isSendMsg = false) => {
    const tokens = savedChats[chatId].gptHistoryToken;
    savedChats[chatId].gptHistory = [];
    savedChats[chatId].gptHistoryToken = 0;
    if (isSendMsg && tokens > 0) {
        bot.sendMessage(chatId, `Диалог сброшен, символы: ${tokens}шт.`);
    }
}

const updateGptHistory = (chatId, text) => {
    savedChats[chatId].gptHistoryToken = savedChats[chatId].gptHistoryToken + text.length;
    savedChats[chatId].gptHistory.push({role: "user", content: text});
}

const answerGpt = async (bot, chatId, text, fileObj = null) => {
    const currentTime = new Date().getTime();

    if (currentTime - savedChats[chatId].lastUpdateGptRequestTime > 2000 && !savedChats[chatId].isBlockedGptRequest) {
        if (requestObj.limit === requestLimitObj.limit) {
            return bot.sendMessage(chatId, 'Слишком частые запросы. Подождите немного');
        }
        bot.sendChatAction(chatId, savedChats[chatId].gptType.botAction);

        savedChats[chatId].lastUpdateGptRequestTime = currentTime;
        savedChats[chatId].isBlockedGptRequest = true;

        requestObj.limit = requestObj.limit + 1;
        requestGpt(bot, chatId, text, fileObj);
        setTimeout(() => {
            requestObj.limit = requestObj.limit - 1;
        }, 21000);
    }
}

// const convertOggToMp3 = async (oggFileUrl, outputFile) => {
//     return new Promise((resolve, reject) => {
//       https.get(oggFileUrl, (stream) => {
//         ffmpeg().input(stream)
//         .inputOption('-t 30')
//         .output(fs.createWriteStream(outputFile))
//         .on('error', (err) => {
//           reject(err);
//         })
//         .on('end', () => {
//           resolve(outputFile);
//         })
//         .run();
//       });
//     });
//   }

const requestGpt = async (bot, chatId, text, fileObj = null) => {
    const type = savedChats[chatId].gptType.type;
    let answer = "Ничего не понятно..";
    let result = null;
    let typeAnswer = null;

    try {
        switch(type) {
            case constants.GPT_TYPE.dialog.type:
                if (fileObj) {
                    if (fileObj.type === 'audio') {
                        savedChats[chatId].isBlockedGptRequest = false;
                        text = text + ' ' + await getOpenAITranscriptionText(fileObj);
                    }
                    if (fileObj.type === 'video') {
                        savedChats[chatId].isBlockedGptRequest = false;
                        text = text + ' ' + await getOpenAITranscriptionTextByVideo(fileObj);
                    }
                }
                if (savedChats[chatId].gptHistoryToken + text.length > constants.GPT_TYPE.maxToken) {
                    return bot.sendMessage(chatId,
                        `Превышено максимальное количество символов в истории диалога ${constants.GPT_TYPE.maxToken + '/' + savedChats[chatId].gptHistoryToken + text.length}`,
                        againOptions
                    );
                }
                updateGptHistory(chatId, text);
                typeAnswer = 'text';
                result = await openai.createChatCompletion({
                    model: constants.GPT_MODELS.turbo,
                    // messages: [{role: "user", content: text}],
                    messages: savedChats[chatId].gptHistory,
                });
                answer = result.data.choices[0].message.content;
                break;
            case constants.GPT_TYPE.default.type:
                typeAnswer = 'text';
                result = await openai.createCompletion({
                    max_tokens: 2000,
                    model: constants.GPT_MODELS.text,
                    prompt: text,
                    temperature: 0.5,
                });
                answer = result.data.choices[0].text;
                break;
            case constants.GPT_TYPE.audio.type:
                typeAnswer = 'text';
                savedChats[chatId].isBlockedGptRequest = false;
                if (fileObj.type === 'audio') {
                    savedChats[chatId].isBlockedGptRequest = false;
                    answer = await getOpenAITranscriptionText(fileObj);
                }
                break;
            case constants.GPT_TYPE.video.type:
                typeAnswer = 'text';
                savedChats[chatId].isBlockedGptRequest = false;
                if (fileObj.type === 'video') {
                    savedChats[chatId].isBlockedGptRequest = false;
                    answer = await getOpenAITranscriptionTextByVideo(fileObj);
                }
                break;
            case constants.GPT_TYPE.video_audio.type:
                typeAnswer = 'audio';
                savedChats[chatId].isBlockedGptRequest = false;
                if (fileObj.type === 'video') {
                    savedChats[chatId].isBlockedGptRequest = false;
                    answer = await createAudioByVideoAndSendToChat(fileObj);
                    result = true;
                }
                break;
            case constants.GPT_TYPE.image.type:
                typeAnswer = 'image';
                result = await openai.createImage({
                    n: 1,
                    prompt: text,
                    size: "1024x1024",
                });
                answer = result.data.data[0].url;
                break;
            case constants.GPT_TYPE.imageStablediffusion.type:
                savedChats[chatId].isBlockedGptRequest = false;
                if (fileObj.type === 'photo') {
                    return getStablediffusionImage(bot, chatId, text, fileObj.file);
                }
            // case constants.GPT_TYPE.image.type:
            //     reloadGptHistory(chatId);
            //     typeAnswer = 'image';
            //     const model = constants.GPT_MODELS['image_replicate'];
            //     const input = { prompt: text };
                // result = await replicate.run(model, { input });
                // answer = result[0];
                // const res = await midjourney("mdjrny-v4 style a painting of a ginger cat.")
                // await bot.telegram.sendMessage(chatId, res.toString());

        }
        savedChats[chatId].isBlockedGptRequest = false;
        if (result) {
            if (typeAnswer && answer) {
                switch(typeAnswer) {
                    case "text":
                        if (type === constants.GPT_TYPE.dialog.type) {
                            return bot.sendMessage(chatId, answer, speechAndAgainOptions);
                        } else {
                            if (answer.length > 4096) {
                                for (let x = 0; x < answer.length; x += 4096) {
                                    bot.sendMessage(chatId, answer.slice(x, x + 4096));
                                }
                                return;
                            } else {
                                return bot.sendMessage(chatId, answer);
                            }
                        }
                    case "image":
                        const newMoreOptions = moreOptions;
                        newMoreOptions.caption = text;
                        return bot.sendPhoto(chatId, answer, newMoreOptions);
                    case "audio":
                        return bot.sendAudio(chatId, answer);
                    default:
                        return bot.sendMessage(chatId, answer);
                }
            } else {
                return bot.sendMessage(chatId, `Некорректно задан вопрос или превышена длина`);
            }
        } else {
            return bot.sendMessage(chatId, answer);
        }
    } catch (e) {
        savedChats[chatId].isBlockedGptRequest = false;
        return bot.sendMessage(chatId, 'Произошла ошибка запроса: ' + e);
    }
}

function reduceBitrate(inputStream) {
    return new Promise((resolve, reject) => {
        const outputChunks = [];
        ffmpeg(inputStream)
        .audioBitrate(64)
        .on("error", reject)
        .on("end", () => resolve(Buffer.concat(outputChunks)))
        .format("mp3")
        .pipe(
            new Writable({
            write(chunk, encoding, callback) {
                outputChunks.push(chunk);
                callback();
            },
            })
        );
    });
}
  
function bufferToReadableStream(buffer, filename) {
    const readable = new Readable({
        read() {
        this.push(buffer);
        this.push(null);
        },
    });
    readable.path = filename;
    return readable;
}

function arrayBufferToStream(buffer) {
    const readable = new Readable({
        read() {
        this.push(Buffer.from(buffer));
        this.push(null);
        },
    });
    return readable;
}

async function getOpenAITranscriptionText(fileObj) {
    const response = await axios.get(fileObj.file, {
        responseType: "arraybuffer",
    });
    const inputStream = arrayBufferToStream(response.data);
    const resizedBuffer = await reduceBitrate(inputStream);
    const resizedStream = bufferToReadableStream(resizedBuffer, "audio.mp3");

    // return bot.sendAudio(chatId, resizedStream);

    const result = await openai.createTranscription(
        resizedStream, constants.GPT_MODELS.audio
    );
    return result.data.text;
}

function reduceBitrateByBotFile(fileObj) {
    return new Promise(async (resolve, reject) => {
        const file = 'output.mp4';
        const response = await axios({
            method: 'get',
            url: fileObj.file.href,
            responseType: 'stream',
        });
        const outStream = await new Promise((resolve) => {
            const stream = fs.createWriteStream(file);
            response.data.pipe(stream);
            stream.on('finish', () => {
                resolve(file)
            })
        });
        // const filePath = await bot.downloadFile(file.id, '');
        const outputChunks = [];
        ffmpeg(outStream)
            .outputOptions('-f mp3')
            .on("error", reject)
            .on("end", () => resolve(Buffer.concat(outputChunks)))
            .format("mp3")
            .pipe(
                new Writable({
                    write(chunk, encoding, callback) {
                        outputChunks.push(chunk);
                        callback();
                    },
                })
            );
    });
}

async function getOpenAITranscriptionTextByVideo(fileObj) {
    const resizedBuffer = await reduceBitrateByBotFile(fileObj);
    const resizedStream = bufferToReadableStream(resizedBuffer, "audio.mp3");

    const result = await openai.createTranscription(
        resizedStream, constants.GPT_MODELS.audio
    );

    return result.data.text;
}

async function createAudioByVideoAndSendToChat(fileObj) {
    const resizedBuffer = await reduceBitrateByBotFile(fileObj);

    return { source: resizedBuffer, filename: 'output.mp3' };
    // bot.downloadFile(file.id, '').then((filePath) => {
        
    // });
}

const getStablediffusionImage = async (bot, chatId, text, photo = null) => {
    const prompt = text;
    let js = null;
    let url = null;
    if (photo) {
        url = 'https://stablediffusionapi.com/api/v3/img2img';
        js = {
            "key": process.env.STABLE_DIFFUSION_API_TOKEN,
            "model_id": "midjourney",
            "prompt": prompt ,
            "negative_prompt": null,
            "init_image": photo,
            "width": "1024",
            "height": "1024",
            "samples": "1",
            "num_inference_steps": "30",
            "safety_checker": "yes",
            "strength": 0.7,
            "seed": null,
            "guidance_scale": 7.5,
            "webhook": null,
            "track_id": null
        };
    } else {
        url = 'https://stablediffusionapi.com/api/v3/text2img';
        js = {
            "key": process.env.STABLE_DIFFUSION_API_TOKEN,
            "model_id": "midjourney",
            "prompt": prompt ,
            "negative_prompt": "((out of frame)), ((extra fingers)), mutated hands, ((poorly drawn hands)), ((poorly drawn face)), (((mutation))), (((deformed))), (((tiling))), ((naked)), ((tile)), ((fleshpile)), ((ugly)), (((abstract))), blurry, ((bad anatomy)), ((bad proportions)), ((extra limbs)), cloned face, (((skinny))), glitchy, ((extra breasts)), ((double torso)), ((extra arms)), ((extra hands)), ((mangled fingers)), ((missing breasts)), (missing lips), ((ugly face)), ((fat)), ((extra legs)), anime",
            "width": "1024",
            "height": "1024",
            "samples": "1",
            "num_inference_steps": "20",
            "safety_checker": "no",
            "enhance_prompt": "yes",
            "seed": null,
            "guidance_scale": 7.5,
            "webhook": null,
            "track_id": null
        };
    }
    const options = {
        headers: {
            "Content-Type": "application/json",
        },
    };
    const bodyInfo = JSON.stringify(js);

    const result = await axios.post(url, bodyInfo, options)
    if (!result || !result.data.output) {
        return bot.sendMessage(chatId, 'Что-то пошло не так..');
    } else {
        const answer = result.data.output[0];
        const newMoreStablediffusionOptions = moreStablediffusionOptions;
        newMoreStablediffusionOptions.caption = prompt;
        return bot.sendPhoto(chatId, answer, newMoreStablediffusionOptions);
    }

}

// DEFAULT
bot.help((ctx) => {
    return ctx.reply('Команды:' + '\n' + constants.BOT_CHAT_COMMANDS + '\n' + 'Версия бота: ' + constants.BOT_CHAT_VERSION);
});

bot.start( async (ctx) => {
    const msg = ctx.message;
    const botInstance = ctx.telegram;
    const chatId = ctx.message.chat.id;

    if (!savedChats[chatId]) {
        savedChats[chatId] = {
            gptType: constants.GPT_TYPE.default,
            gptHistory: [],
            gptHistoryToken: 0,
            isAuth: process.env.ADMIN_ID !== chatId.toString() ? false : true,
            lastUpdateGptRequestTime: 0,
            isBlockedGptRequest: false,
        };
    }
    // await UserModel.create({chatId})
    return botInstance.sendMessage(chatId, `Приветствуем Вас ${msg.from.first_name ? msg.from.first_name : 'гость'} в чате!`);
});

// AUTH
bot.command('auth', async (ctx) => {
    const chatId = ctx.message.chat.id;
    const msg = ctx.message;
    const botInstance = ctx.telegram;

    if (process.env.ADMIN_ID === chatId.toString()) {
        let userList = '';
        authUserList.forEach(user => {
            userList = userList + '\n' + user.name; 
        });

        const authList = [];
        authRequestList.forEach(user => {
            authList.push({ text: user.name, callback_data: user.chatId });
        });
        return botInstance.sendMessage(chatId,
            `Список авторизованных${userList.length ? ':' + userList + '\n' : ' пуст' + '\n'}Список на авторизацию${authList.length ? ':' : ' пуст'}`, {
            reply_markup: JSON.stringify({
                inline_keyboard: [
                    authList,
                ]
            })
        });
    } else {
        if (savedChats[chatId].isAuth) {
            return botInstance.sendMessage(chatId, `${msg.from.first_name}, Вы уже авторизованы в чате!`);
        } else {
            authRequestList.forEach(user => {
                if (chatId.toString() === user.chatId) {
                    return botInstance.sendMessage(chatId, `Запрос на авторизацию в чате уже отправлен, ожидайте`);
                }
            });
            authRequestList.push({ name: msg.from.first_name, chatId: chatId.toString() });
            const adminId = parseInt(process.env.ADMIN_ID, 10);
            botInstance.sendMessage(adminId, `Новый запрос на авторизацию от ${msg.from.first_name}`);
            return botInstance.sendMessage(chatId, `Запрос на авторизацию в чате отправлен`);
        }
    }
    // sendGpt(chatId);
});

// GPT
bot.command('gpt_type', (ctx) => {
    const chatId = ctx.message.chat.id;
    const botInstance = ctx.telegram;

    if (savedChats[chatId] && savedChats[chatId].isAuth) {
        let choiceOptions = choiceTypeGptDefualtOptions;
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.dialog.type) {
            choiceOptions = choiceTypeGptDialogOptions;
        }
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.image.type) {
            choiceOptions = choiceTypeGptImageOptions;
        }
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.audio.type) {
            choiceOptions = choiceTypeGptAudioOptions;
        }
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.video.type) {
            choiceOptions = choiceTypeGptVideoOptions;
        }
        if (savedChats[chatId].gptType.type === constants.GPT_TYPE.video_audio.type) {
            choiceOptions = choiceTypeGptVideoAudioOptions;
        }
        return botInstance.sendMessage(chatId, `Выберите режим общения с ботом`, choiceOptions);
    } else {
        return botInstance.sendMessage(chatId, 'Похоже, что Вы не авторизованы');
    }
});

// CHOICE TYPE GPT
// const choiceTypeGpt = async (chatId) => {
//     const defaultCatigories = [];
//     defaultCatigories.push(createBotButton('Обычный', 'default_type_gpt'));
//     defaultCatigories.push(createBotButton('Диалог', 'dialog_type_gpt'));
//     defaultCatigories.push(createBotButton('Изображение', 'image_type_gpt'));
//     // defaultCatigories.push(createBotButton('Изображение профи', 'image_profi_type_gpt'));
//     await bot.telegram.sendMessage(chatId,
//         `Выбран режим: "${savedChats[chatId].gptType.name} ✔". Выберите новый режим`,
//         Markup.inlineKeyboard(
//             [
//                 defaultCatigories
//             ]
//         )
//     );

// }

bot.command('photo', (ctx) => {
    const msg = ctx.message;
    const chatId = msg.chat.id;
    const botInstance = ctx.telegram;
    if (msg.photo && msg.photo.length) {
        const photo = msg.photo.pop();
        const fileId = photo.file_id;
        botInstance.getFileLink(fileId).then((link) => {
            fileRequest(botInstance, chatId, '', { id: fileId, type: 'photo', file: link });
        });
        return;
    } else {
        return ctx.reply('Я пока не умею работать с photo');
    }
    // return ctx.replyWithPhoto({ url: PhotoURL });
})

bot.on('voice', (ctx) => {
    const msg = ctx.message;
    const chatId = msg.chat.id;
    const botInstance = ctx.telegram;
    if (msg.voice) {
        const audioFile = msg.voice;
        const fileId = audioFile.file_id;
        botInstance.getFileLink(fileId).then((link) => {
            fileRequest(botInstance, chatId, '', { id: fileId, type: 'audio', file: link });
        });
        return;
    } else {
        return ctx.reply('Я пока не умею работать с voice');
    }
});

bot.on('audio', (ctx) => {
    const msg = ctx.message;
    const chatId = msg.chat.id;
    const botInstance = ctx.telegram;
    if (msg.audio) {
        const audioFile = msg.audio;
        const fileId = audioFile.file_id;
        botInstance.getFileLink(fileId).then((link) => {
            fileRequest(botInstance, chatId, '', { id: fileId, type: 'audio', file: link });
        });
        return;
    } else {
        return ctx.reply('Я пока не умею работать с audio');
    }
    return ctx.reply('Я пока не умею работать с audio');
});

bot.on('video', (ctx) => {
    const msg = ctx.message;
    const chatId = msg.chat.id;
    const botInstance = ctx.telegram;
    if (msg.video) {
        const videoFile = msg.video;

        const { file_id: fileId } = videoFile;
        const { file_unique_id: fileUniqueId } = videoFile;

        botInstance.getFileLink(fileId).then((link) => {
            fileRequest(botInstance, chatId, '', {uniqueId: fileUniqueId, id: fileId, type: 'video', file: link });
        });
        return;
    } else {
        return ctx.reply('Я пока не умею работать с video');
    }
});

bot.on('document', (ctx) => {
    const msg = ctx.message;
    const chatId = msg.chat.id;
    const botInstance = ctx.telegram;

    if (msg.document) {
        const fileName = msg.document.file_name;
        const mimeType = msg.document.mime_type;
        let fileId = null;
        switch(mimeType) {
            case 'audio/mpeg':
                const audioFile = msg.document;
                fileId = audioFile.file_id;
                botInstance.getFileLink(fileId).then((link) => {
                    fileRequest(botInstance, chatId, '', { id: fileId, type: 'audio', file: link });
                });
                break;
            case 'video/mp4':
                const videoFile = msg.document;
                const { file_id: fileId } = videoFile;
                const { file_unique_id: fileUniqueId } = videoFile;

                botInstance.getFileLink(fileId).then((link) => {
                    fileRequest(botInstance, chatId, '', {uniqueId: fileUniqueId, id: fileId, type: 'video', file: link });
                });
                break;
            default:
                return ctx.reply('Я пока не поддерживается');
        }
    } else {
        return ctx.reply('Я пока не умею работать с документами');
    }
});

// TEXT ALL CALL_BACK
bot.on('alert:', (ctx) => {
    console.log('@@ALERT');
});

// TEXT ALL CALL_BACK
bot.on('text', (ctx) => {
    const msg = ctx.message;
    const chatId = msg.chat.id;
    const text = msg.text;
    const botInstance = ctx.telegram;

    // if (savedChats[chatId]) {
    //     if (savedChats[chatId].gptType) {
    //         answerGpt(chatId, ctx.message.text)
    //     }
    // }

    let replyToText = null;
    let resText = text;
    if (msg.reply_to_message) {
        replyToText = msg.reply_to_message.text;
        if (replyToText) {
            resText = replyToText + '\n' + text;
        }
        console.log('@@', msg.reply_to_message);
        if (msg.reply_to_message.photo && msg.reply_to_message.photo.length) {
            const photo = msg.reply_to_message.photo.pop();
            const fileId = photo.file_id;
            botInstance.getFileLink(fileId).then((link) => {
                fileRequest(botInstance, chatId, resText, { id: fileId, type: 'photo', file: link });
            });
            return;
        }
        if (msg.reply_to_message.voice) {
            const audioFile = msg.reply_to_message.voice;
            const fileId = audioFile.file_id;
            botInstance.getFileLink(fileId).then((link) => {
                fileRequest(botInstance, chatId, resText, { id: fileId, type: 'audio', file: link });
            });
            return;
        }
        if (msg.reply_to_message.video) {
            const videoFile = msg.reply_to_message.video;
            const { file_id: fileId } = videoFile;
            const { file_unique_id: fileUniqueId } = videoFile;
            botInstance.getFileLink(fileId).then((link) => {
                fileRequest(botInstance, chatId, resText, {uniqueId: fileUniqueId, id: fileId, type: 'video', file: link });
            });
            return;
        }
    }

    try {
        if (text.startsWith('/alert:')) {
            if (process.env.ADMIN_ID === chatId.toString()) {
                const textAlert = text.split('/alert:')[1];
                for (const [chatKey, chatValue] of Object.entries(savedChats)) {
                    if (chatValue.isAuth) {
                        botInstance.sendMessage(chatKey, 'Важное сообщение:' + '\n' + textAlert);
                    }
                }
                return;
            } else {
                return botInstance.sendMessage(chatKey, 'Только для админов');
            }
        }
        if (savedChats[chatId] && savedChats[chatId].isAuth) {
            if (savedChats[chatId].gptType) {
                answerGpt(botInstance, chatId, resText);
                return;
            }
        } else {
            return botInstance.sendMessage(chatId, 'Похоже, что Вы не авторизованы');
        }

    } catch (e) {
        return botInstance.sendMessage(chatId, 'Произошла какая то ошибочка!)');
    }

});

// CHOICE ALL CALL_BACK
bot.on('callback_query', async (ctx) => {
    const botInstance = ctx.telegram;
    const msg = ctx.update.callback_query.message;
    const messageId = msg.message_id;
    const chatId = msg.chat.id;
    const data = ctx.update.callback_query.data;

    // ctx.telegram.answerCbQuery(ctx.callbackQuery.id);
    // await ctx.answerCbQuery();

    let field = null;
    let fieldId = null;

    if (data) {
        field = data.split(':')[0];
        if (data.split(':')[1]) {
            fieldId = data.split(':')[1];
        }
    }

    if (savedChats[chatId] && savedChats[chatId].isAuth) {
        switch(field) {
            // GPT
            case '/default_type_gpt':
                reloadGptHistory(botInstance, chatId);
                saveCurrentMsgToGpt(botInstance, chatId, messageId, constants.GPT_TYPE.default);
                break;
            case '/dialog_type_gpt':
                reloadGptHistory(botInstance, chatId, true);
                saveCurrentMsgToGpt(botInstance, chatId, messageId, constants.GPT_TYPE.dialog);
                break;
            case '/image_type_gpt':
                reloadGptHistory(botInstance, chatId);
                saveCurrentMsgToGpt(botInstance, chatId, messageId, constants.GPT_TYPE.image);
                break;
            case '/audio_type_gpt':
                reloadGptHistory(botInstance, chatId);
                saveCurrentMsgToGpt(botInstance, chatId, messageId, constants.GPT_TYPE.audio);
                break;
            case '/video_type_gpt':
                reloadGptHistory(botInstance, chatId);
                saveCurrentMsgToGpt(botInstance, chatId, messageId, constants.GPT_TYPE.video);
                break;
            case '/video_audio_type_gpt':
                reloadGptHistory(botInstance, chatId);
                saveCurrentMsgToGpt(botInstance, chatId, messageId, constants.GPT_TYPE.video_audio);
                break;
            case '/text_to_speech':
                if (msg.text && savedChats[chatId].gptType.type === constants.GPT_TYPE.dialog.type) {
                    msg.reply_markup.inline_keyboard = msg.reply_markup.inline_keyboard.filter(element => element[0].callback_data !== field);
                    botInstance.editMessageReplyMarkup(chatId, messageId, null, msg.reply_markup);
                    botInstance.sendChatAction(chatId, 'record_voice');
                    // answerGpt(botInstance, chatId, text);
                }
                let all = msg.text;
                if (all.length > 100) {
                    while(all.length > 0) {
                        if (all.length > 100) {
                            let substr = all.substring(0, 100);
                            await textToSpeech(botInstance, chatId, substr);
                            all = all.substring(100);
                        } else {
                            await textToSpeech(botInstance, chatId, all);
                            all = '';
                        }
                    }
                } else {
                    textToSpeech(botInstance, chatId, all);
                }
                break;

            case '/more_gpt_image':
                if (msg.caption && savedChats[chatId].gptType.type === constants.GPT_TYPE.image.type) {
                    msg.reply_markup.inline_keyboard = msg.reply_markup.inline_keyboard.filter(element => element[0].callback_data !== field);
                    botInstance.editMessageReplyMarkup(chatId, messageId, null, msg.reply_markup);
                    answerGpt(botInstance, chatId, msg.caption);
                }
                break;

            // Stablediffusion    
            case '/image_type_stablediffusion':
                reloadGptHistory(botInstance, chatId);
                saveCurrentMsgToGpt(botInstance, chatId, messageId, constants.GPT_TYPE.imageStablediffusion);
                break;
            case '/more_stablediffusion_image':
                return botInstance.sendMessage(chatId, 'Скоро появится');

                if (msg.caption && savedChats[chatId].gptType.type === constants.GPT_TYPE.imageStablediffusion.type) {
                    msg.reply_markup.inline_keyboard = msg.reply_markup.inline_keyboard.filter(element => element[0].callback_data !== field);
                    botInstance.editMessageReplyMarkup(chatId, messageId, null, msg.reply_markup);
                    getStablediffusionImage(botInstance, chatId, msg.caption);
                }
                break;

            case '/reload_gpt_dialog':
                msg.reply_markup.inline_keyboard = msg.reply_markup.inline_keyboard.filter(element => element[0].callback_data !== field);
                botInstance.editMessageReplyMarkup(chatId, messageId, null, msg.reply_markup);
                reloadGptHistory(botInstance, chatId, true);
                break;

            default:
                // AUTH
                if (process.env.ADMIN_ID === chatId.toString()) {
                    let authUser = null;
                    authRequestList.forEach(user => {
                        if (user.chatId === data) {
                            authUser = user;
                        }
                    });
                    if (authUser) {
                        const userId = parseInt(authUser.chatId, 10);
                        botInstance.sendMessage(userId, 'Поздравляем, теперь Вы авторизованы в чате!');
                        if (!savedChats[userId].isAuth) {
                            savedChats[userId].isAuth = true;
                        }
                        authUserList.push({ name: authUser.name, chatId: authUser.chatId });
                        authRequestList = authRequestList.filter(u => u.chatId !== authUser.chatId);
                        return botInstance.sendMessage(chatId, `Авторизован ${authUser.name}`);
                    } else {
                        return botInstance.sendMessage(chatId, `Нет ${data} в списке`);
                    }
                }
                // DEFAULT
                return ctx.reply('Ничего..');
        }
    } else {
        return ctx.reply('Похоже, что Вы не авторизованы');
    }

});

const textToSpeech = async (bot, chatId, text) => {
    const voiceLang = "ru-RU"; // язык озвучивания
    const voice = "Peter"; // голос озвучивания
    const voiceFormat = '48khz_16bit_stereo';
    const voiceCodec = 'MP3';
    const voiceSpeed = '3';
    const url = `https://api.voicerss.org/?key=${process.env.VOICERSS_TOKEN}&hl=${voiceLang}&r=${voiceSpeed}&c=${voiceCodec}&v=${voice}&f=${voiceFormat}&src=${encodeURIComponent(text)}`;

    try {
        const response = await axios.get(url, {
            responseType: "arraybuffer",
        });
        const inputStream = arrayBufferToStream(response.data);
        const resizedBuffer = await reduceBitrate(inputStream);
        const resizedStream = bufferToReadableStream(resizedBuffer, "audio.mp3");

        return await bot.sendAudio(chatId, { source: resizedStream, filename: 'audio.mp3' });
    } catch(e) {
        return bot.sendMessage(chatId, e);
    }
}

const cb = function(req, res) {
    res.end(`${bot.options.username}`)
}

try {
    bot.launch({
        webhook: {
            domain: `${process.env.URL}`,
            port: `${process.env.PORT}`,
            host: `${process.env.URL}`,
            cb
        }
    });
    bot.launch();
    if (timerPingId) {
        timerPingId = null;
    }
    pingBot();
} catch(e) {
    timerPingId = null;
    console.log('ERROR: ' + e)
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

process.on('uncaughtException', function (error) {
	console.log("\x1b[31m", "Exception: ", error, "\x1b[0m");
});

process.on('unhandledRejection', function (error, p) {
	console.log("\x1b[31m","Error: ", error.message, "\x1b[0m");
});