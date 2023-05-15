const BOT_CHAT_COMMANDS = `
/start - Перезапустить ChatGPT бота
/gpt_type - Выбрать режим бота
/auth - Запрос на авторизацию
/help - Информация
`

const GPT_MODELS = {
    'turbo': 'gpt-3.5-turbo',
    'text': 'text-davinci-003',
    'image': 'dall-e',
    'image_replicate': 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf',
};

const GPT_TYPE = {
    default: { name: 'Обычный', type: 'default', model: GPT_MODELS.text, maxToken: 8000 },
    dialog: { name: 'Диалог', type: 'dialog', model: GPT_MODELS.turbo, maxToken: 8000 },
    image: { name: 'Изображения', type: 'image', model: GPT_MODELS.image, maxToken: 8000 },
    imageProfi: { name: 'Изображения профи', type: 'image_replicate', model: GPT_MODELS['image_replicate'], maxToken: 0 },
};

module.exports.BOT_CHAT_COMMANDS = BOT_CHAT_COMMANDS
module.exports.GPT_MODELS = GPT_MODELS
module.exports.GPT_TYPE = GPT_TYPE