module.exports = {
    choiceTypeGptDefualtOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Обычный ✅', callback_data: '/default_type_gpt'}, {text: 'Диалог', callback_data: '/dialog_type_gpt'}],
                [{text: 'Изображение', callback_data: '/image_type_gpt'}, {text: 'MidJourney', callback_data: '/image_type_stablediffusion'}],
                [{text: 'Перевести аудио в текст', callback_data: '/audio_type_gpt'}],
                [{text: 'Перевести видео в текст', callback_data: '/video_type_gpt'}],
                [{text: 'Перевести видео в аудио', callback_data: '/video_audio_type_gpt'}],
            ]
        })
    },

    choiceTypeGptDialogOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Обычный', callback_data: '/default_type_gpt'}, {text: 'Диалог ✅', callback_data: '/dialog_type_gpt'}],
                [{text: 'Изображение', callback_data: '/image_type_gpt'}, {text: 'MidJourney', callback_data: '/image_type_stablediffusion'}],
                [{text: 'Перевести аудио в текст', callback_data: '/audio_type_gpt'}],
                [{text: 'Перевести видео в текст', callback_data: '/video_type_gpt'}],
                [{text: 'Перевести видео в аудио', callback_data: '/video_audio_type_gpt'}],
            ]
        })
    },

    choiceTypeGptImageOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Обычный', callback_data: '/default_type_gpt'}, {text: 'Диалог', callback_data: '/dialog_type_gpt'}],
                [{text: 'Изображение ✅', callback_data: '/image_type_gpt'}, {text: 'MidJourney', callback_data: '/image_type_stablediffusion'}],
                [{text: 'Перевести аудио в текст', callback_data: '/audio_type_gpt'}],
                [{text: 'Перевести видео в текст', callback_data: '/video_type_gpt'}],
                [{text: 'Перевести видео в аудио', callback_data: '/video_audio_type_gpt'}],
            ]
        })
    },

    choiceTypeGptAudioOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Обычный', callback_data: '/default_type_gpt'}, {text: 'Диалог', callback_data: '/dialog_type_gpt'}],
                [{text: 'Изображение', callback_data: '/image_type_gpt'}, {text: 'MidJourney', callback_data: '/image_type_stablediffusion'}],
                [{text: 'Перевести аудио в текст ✅', callback_data: '/audio_type_gpt'}],
                [{text: 'Перевести видео в текст', callback_data: '/video_type_gpt'}],
                [{text: 'Перевести видео в аудио', callback_data: '/video_audio_type_gpt'}],
            ]
        })
    },

    choiceTypeGptVideoOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Обычный', callback_data: '/default_type_gpt'}, {text: 'Диалог', callback_data: '/dialog_type_gpt'}],
                [{text: 'Изображение', callback_data: '/image_type_gpt'}, {text: 'MidJourney', callback_data: '/image_type_stablediffusion'}],
                [{text: 'Перевести аудио в текст', callback_data: '/audio_type_gpt'}],
                [{text: 'Перевести видео в текст ✅', callback_data: '/video_type_gpt'}],
                [{text: 'Перевести видео в аудио', callback_data: '/video_audio_type_gpt'}],
            ]
        })
    },

    choiceTypeGptVideoAudioOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Обычный', callback_data: '/default_type_gpt'}, {text: 'Диалог', callback_data: '/dialog_type_gpt'}],
                [{text: 'Изображение', callback_data: '/image_type_gpt'}, {text: 'MidJourney', callback_data: '/image_type_stablediffusion'}],
                [{text: 'Перевести аудио в текст', callback_data: '/audio_type_gpt'}],
                [{text: 'Перевести видео в текст', callback_data: '/video_type_gpt'}],
                [{text: 'Перевести видео в аудио ✅', callback_data: '/video_audio_type_gpt'}],
            ]
        })
    },

    choiceTypeStablediffusionImageOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Обычный', callback_data: '/default_type_gpt'}, {text: 'Диалог', callback_data: '/dialog_type_gpt'}],
                [{text: 'Изображение', callback_data: '/image_type_gpt'}, {text: 'MidJourney ✅', callback_data: '/image_type_stablediffusion'}],
                [{text: 'Перевести аудио в текст', callback_data: '/audio_type_gpt'}],
                [{text: 'Перевести видео в текст', callback_data: '/video_type_gpt'}],
                [{text: 'Перевести видео в аудио', callback_data: '/video_audio_type_gpt'}],
            ]
        })
    },

    againOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Сбросить диалог', callback_data: '/reload_gpt_dialog'}],
            ]
        })
    },

    moreOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Ещё', callback_data: '/more_gpt_image'}],
            ]
        })
    },

    moreStablediffusionOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: [
                [{text: 'Ещё', callback_data: '/image_type_stablediffusion'}],
            ]
        })
    },

    emptyOptions: {
        reply_markup: JSON.stringify({
            inline_keyboard: []
        })
    },

}
