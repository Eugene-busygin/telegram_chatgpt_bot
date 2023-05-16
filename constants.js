const BOT_CHAT_VERSION = `1.19`

const BOT_CHAT_COMMANDS = `
/start - Перезапустить ChatGPT бота
/gpt_type - Выбрать режим бота
/auth - Запрос на авторизацию
/info - Информация
`

const GPT_MODELS = {
    'turbo': 'gpt-3.5-turbo',
    'text': 'text-davinci-003',
    'image': 'dall-e',
    'audio': 'whisper-1',
    'image_stablediffusion': 'https://stablediffusionapi.com/api/v3/',
};

const GPT_TYPE = {
    default: { name: 'Обычный', type: 'default', botAction: 'typing', model: GPT_MODELS.text, maxToken: 2048 },
    dialog: { name: 'Диалог', type: 'dialog', botAction: 'typing', model: GPT_MODELS.turbo, maxToken: 4096 },
    image: { name: 'Изображениe', type: 'image', botAction: 'upload_photo', model: GPT_MODELS.image, maxToken: null },
    audio: { name: 'Перевод аудио в текст', type: 'audio', botAction: 'typing', model: GPT_MODELS.audio, maxToken: null },
    video: { name: 'Перевод видео в текст', type: 'video', botAction: 'typing', model: GPT_MODELS.audio, maxToken: null },
    video_audio: { name: 'Перевод видео в аудио', type: 'video_audio', botAction: 'record_voice', model: null, maxToken: null },
    imageStablediffusion: { name: 'MidJourney', botAction: 'upload_photo', type: 'image_stablediffusion', model: GPT_MODELS['image_stablediffusion'], maxToken: null },
};

module.exports.BOT_CHAT_VERSION = BOT_CHAT_VERSION
module.exports.BOT_CHAT_COMMANDS = BOT_CHAT_COMMANDS
module.exports.GPT_MODELS = GPT_MODELS
module.exports.GPT_TYPE = GPT_TYPE