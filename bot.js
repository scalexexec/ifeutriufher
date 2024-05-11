const TelegramBot = require('node-telegram-bot-api');
const UserDataManager = require('./UserDataManager');

const token = '6815782543:AAE804K6_RSnRuVeJN_whazjufyb5OLGIMQ';
const channelID = '@Dodldodbot';
const channels = ['@sollucensss', '@bureau_avery', '@chereshenka_lal_chanel']; // Здесь нужно указать ID каналов

const userDataManager = new UserDataManager();
const bot = new TelegramBot(token, { polling: true });

function checkRewardEligibility(userData) {
  const currentTime = new Date().getTime();
  const lastCoinClaimTime = userData.lastCoinClaimTime || 0;

  if (currentTime - lastCoinClaimTime >= 24 * 60 * 60 * 1000) {
    return true;
  }

  return false;
}

function startRewardCheckingProcess(interval) {
  setInterval(() => {
    const allUserIds = userDataManager.getAllUserIds();

    for (const userId of allUserIds) {
      try {
        const userData = userDataManager.loadUserData(userId);

        if (checkRewardEligibility(userData)) {
          const chatId = userData.userId;
          bot.sendMessage(chatId, `Пора крутить, твой запас круток обновился!`);
        }
      } catch (err) {
        console.error(`Ошибка при проверке пользователя с ID ${userId} на возможность получения награды:`, err.message);
      }
    }
  }, interval);
}

function sendMainMenu(chatId, userData, msg) {
    const message = `Приветик ${msg.from.first_name} !!\n\nDODLbot - бот в котором ты сможешь получить донат в Genshin Impact и Honkai: Star Rail\nА так же получить Телеграм премиум\nСкорее крути!!\n\nТвой баланс:\n\n${userData.currencyStars || 0} круток 💫\n${userData.currencyCoins || 0} монет 🪙`;
    bot.sendMessage(chatId, message, {
        reply_markup: {
        inline_keyboard: [
            [{ text: 'Профиль', callback_data: 'profile' }, { text: 'Крутить', callback_data: 'spin' }],
            [{ text: 'Получить крутки', callback_data: 'get_stars' }, { text: 'Помощь', callback_data: 'help' }],
            [{ text: 'Магазин', callback_data: 'shop' }, { text: 'Кейсы', callback_data: 'cases' }],
            [{ text: 'Помощь', callback_data: 'help' }]
        ]
        }
    });
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    let userData = userDataManager.loadUserData(msg.from.id);
  
    try {
      const res = await bot.getChatMember(channelID, chatId);
      if (res && (res.status === 'member' || res.status === 'administrator' || res.status === 'creator')) {
        sendMainMenu(chatId, userData, msg);
      } else {
        bot.sendMessage(chatId, '📰 Условием данного бота является подписка на канал [Название канала](https://t.me/doodltest)', {
        parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Перейти', url: 'https://t.me/doodltest' }],
                    [{ text: 'Я подписался', callback_data: 'subscribed' }]
                ]
            }
        });
      }
    } catch (err) {
      console.error('Ошибка при проверке подписки на канал:', err.message);
      bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже.');
    }
  });

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    let userData = userDataManager.loadUserData(userId);

    if (query.data === 'subscribed') {
      try {
        const res = await bot.getChatMember(channelID, userId);
        
        if (res && (res.status === 'member' || res.status === 'administrator' || res.status === 'creator')) {
            sendMainMenu(chatId, userData, msg);
            bot.answerCallbackQuery(query.id, 'Спасибо за подписку на канал!');
        } else {
          bot.answerCallbackQuery(query.id, 'Вы не подписались на канал!');
        }
      } catch (err) {
        console.error('Ошибка при проверке подписки на канал:', err.message);
        bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже.');
      }
    } else if (query.data === 'profile') {
        try {
            const userName = query.from.first_name;
            const userId = query.from.id;
            const coins = userData.currencyCoins || 0;
            const stars = userData.currencyStars || 0;
            const moons = userData.itemMoon || 0;
            const passes = userData.itemPass || 0;
            const premium = userData.itemPremium || 0;
            const totalCoinsReceived = userData.totalCoinsReceived || 0;
            const totalStarsSpent = userData.totalStarsSpent || 0;

            const message = `Имя: ${userName}\nID: ${userId}\n\nБаланс:\n${coins} монет\n${stars} круток\n${moons} лун/пропусков\n${premium} telegram premium\n\nВсего получено монет: ${totalCoinsReceived}\nВсего откручено круток: ${totalStarsSpent}`;
            bot.answerCallbackQuery(query.id);
            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                    [{ text: 'Назад ⏪', callback_data: 'mainmenu' }, { text: 'Вывод предметов', callback_data: 'items' }]
                    ]
                }
            });
        } catch (err) {
          console.error('Ошибка при выводе профиля пользователя:', err.message);
          bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже.');
        }
    } else if (query.data === 'mainmenu') {
        bot.answerCallbackQuery(query.id);
        sendMainMenu(chatId, userData, query);
    } else if (query.data === 'get_stars') {
        try {
          const currentTime = new Date().getTime();
          const lastCoinClaimTime = userData.lastCoinClaimTime || 0;

          if (currentTime - lastCoinClaimTime >= 24 * 60 * 60 * 1000) {
            userData.currencyStars = (userData.currencyStars || 0) + 1;

            userData.lastCoinClaimTime = currentTime;

            const subscribedChannels = [];
            const unsubscribedChannels = [];
            for (let i = 0; i < channels.length; i++) {
                const channel = channels[i];
                try {
                    const res = await bot.getChatMember(channel, userId);
                    if (res && (res.status === 'member' || res.status === 'administrator' || res.status === 'creator')) {
                    subscribedChannels.push(channel);
                    } else {
                    unsubscribedChannels.push(`Канал ${i + 1}`);
                    }
                } catch (err) {
                    console.error(`Ошибка при проверке подписки на канал ${channel}:`, err.message);
                }
            }

            userData.currencyStars += subscribedChannels.length;
            userDataManager.saveUserData(userId, userData);

            let message = `Поздравляю! Вы получили дополнительную крутку! Теперь у вас ${userData.currencyStars} круток.\n\n`;

            if (unsubscribedChannels.length > 0) {
                message += 'Для получения дополнительных круток подпишитесь на следующие каналы:\n\n';
                message += unsubscribedChannels.join('\n');
            }
            
            bot.answerCallbackQuery(query.id);
            bot.sendMessage(chatId, message, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Назад ⏪', callback_data: 'mainmenu' }]
                ]
              }
            });
          } else {
            bot.answerCallbackQuery(query.id);
            bot.sendMessage(chatId, 'Вы уже получили крутку за последние 24 часа.', {
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Назад ⏪', callback_data: 'mainmenu' }]
                ]
              }
            });
          }
        } catch (err) {
          console.error('Ошибка при попытке получить крутку:', err.message);
          bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже.');
        }
      } else if (query.data === 'spin') {
          try {
            if(userData.currencyStars >= 1)
            {
              const randomNumber = Math.floor(Math.random() * 100) + 1;

              let points = 0;
              if (randomNumber <= 20) {
                await bot.sendVideo(chatId, 'https://drive.google.com/uc?export=download&id=1tiJ46RuMAShVHbQ86rZZzbTU8bpKzAZe');
                await new Promise(resolve => setTimeout(resolve, 4000));

                points = 10;
              } else if (randomNumber <= 70) {
                await bot.sendVideo(chatId, 'https://drive.google.com/uc?export=download&id=1caFple0YiUqAzXjrkBOGAFYJtKHzcoGD');
                await new Promise(resolve => setTimeout(resolve, 5000));

                points = 5;
              } else {
                await bot.sendVideo(chatId, 'https://drive.google.com/uc?export=download&id=1kxfHhsvsmc7s9N1zaVKeDapQy4pVCXK0');
                await new Promise(resolve => setTimeout(resolve, 4000));

                points = 3;
              }
              userData.currencyCoins = (userData.currencyCoins || 0) + points;
              userData.currencyStars = (userData.currencyStars || 0) - 1;

              userData.totalCoinsReceived = userData.totalCoinsReceived + points;
              userData.totalStarsSpent = userData.totalStarsSpent + 1;

              userDataManager.saveUserData(userId, userData);

              let message = '';
              if (points === 10) {
                message = 'Поздравляю, ты получил 10 монет!';
              } else if (points === 5) {
                message = 'Поздравляю, ты получил 5 монет!';
              } else {
                message = 'Сегодня тебе не повезло и тебе досталось 3 монеты.';
              }
              bot.answerCallbackQuery(query.id);
              bot.sendMessage(chatId, message);
            } else {
              bot.answerCallbackQuery(query.id);
              bot.sendMessage(chatId, 'У вас недостаточно круток!', {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Назад ⏪', callback_data: 'mainmenu' }]
                  ]
                }
              });
            }
          } catch (err) {
            console.error('Ошибка при попытке крутить:', err.message);
            bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже.');
          }
      } else if (query.data === 'shop') {
        bot.sendMessage(chatId, 'Добро пожаловать в магазин! Что вы хотите купить?', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Луна', callback_data: 'buy_moon' }, { text: 'Пропуск', callback_data: 'buy_pass' }],
              [{ text: 'Telegram Premium', callback_data: 'buy_premium' }, { text: '<- Назад', callback_data: 'mainmenu' }]
            ]
          }
        });
      } else if (query.data === 'buy_moon') {
        if (userData.currencyCoins >= 900) {
          userData.currencyCoins -= 900;

          userData.itemMoon = (userData.itemMoon || 0) + 1;

          userDataManager.saveUserData(userId, userData);

          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, 'Поздравляем! Вы успешно приобрели луну.');
        } else {
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, 'У вас недостаточно монет для покупки луны.');
        }
      } else if (query.data === 'buy_pass') {
        if (userData.currencyCoins >= 900) {
          userData.currencyCoins -= 900;

          userData.itemPass = (userData.itemPass || 0) + 1;

          userDataManager.saveUserData(userId, userData);
          
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, 'Поздравляем! Вы успешно приобрели пропуск.');
        } else {
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, 'У вас недостаточно монет для покупки пропуска.');
        }
      } else if (query.data === 'buy_premium') {
        if (userData.currencyCoins >= 4500) {
          userData.currencyCoins -= 4500;

          userData.itemPremium = (userData.itemPremium || 0) + 1;

          userDataManager.saveUserData(userId, userData);
          
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, 'Поздравляем! Вы успешно приобрели Telegram Premium.');
        } else {
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, 'У вас недостаточно монет для покупки Telegram Premium.');
        }
      }else if (query.data === 'cases') {
        bot.answerCallbackQuery(query.id);
        bot.sendMessage(chatId, 'Выбери кейс, который ты хочешь открыть:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Мажорский бокс питерской соли', callback_data: 'case_majorsalt' }, { text: 'Да Пиз**', callback_data: 'case_dapizda' }],
              [{ text: 'Косплей бокс черешни', callback_data: 'case_cosplaybox' }/*, { text: 'Недоняшный бокс авери', callback_data: 'case_averibox' }*/],
              [{ text: 'Назад ⏪', callback_data: 'mainmenu' }]
            ]
          }
        });
      } else if (query.data === 'case_majorsalt') {
        bot.answerCallbackQuery(query.id);
        bot.sendMessage(chatId, 'Мажорский бокс питерской соли:\n\nСтоимость: 1200 монет\n\n' +
          'Возможные призы:\n' +
          '50% - 500 монет\n' +
          '20% - луна\n' +
          '15% - 1500 монет\n' +
          '10% - 2500 монет\n' +
          '5% - телеграм премиум три месяца\n\n' +
          'Выбери действие:',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Открыть кейс', callback_data: 'open_case_majorsalt' }],
                [{ text: 'Назад ⏪', callback_data: 'cases' }]
              ]
            }
          });
      } else if (query.data === 'open_case_majorsalt') {
        if (userData.currencyCoins >= 1200) {
          userData.currencyCoins -= 1200;
    
          const randomNumber = Math.random() * 100;
          let prize = '';
          if (randomNumber < 50) {
            bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczOt4ZU05e0PKtH0Glv69Wzn8wiOTkI06Ppr6pVr-hzi58JQoZh3kjRlufwsq9Tr7Bcp792q0qj_LqhF9zH8C6B8RHbRWxg1E76Hn5bQD-gNcCodLLG0OR3OlJoHtUO5t_XTH54TjuLX3AMWEXptHuFJ=w828-h827-s-no-gm?authuser=0', {
              caption: `Ты выиграл 500 монет!`,
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Назад ⏪', callback_data: 'cases' }]
                ]
              }
            });
            userData.currencyCoins += 500;
            userData.totalCoinsReceived = userData.totalCoinsReceived + 500;
          } else if (randomNumber < 70) {
            bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczMYWgsAvbMjiX6IAy6CK35JijBYkNOKjLPafCGoity3cI2wbPIssJzPEy6kt_65btJGrEpyOj5RpydBud-y5-ayQe6xRqKZ0ldCEDjvOmXxI0sqf637xVdnODtxWd_AHD7PU5UNf7gK_1N551Cb8ksM=w828-h827-s-no-gm?authuser=0', {
              caption: `Ты выиграл луну!`,
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Назад ⏪', callback_data: 'cases' }]
                ]
              }
            });
            userData.itemMoon = (userData.itemMoon || 0) + 1;
          } else if (randomNumber < 85) {
            bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczOTgTph5k9jCtR-V7UOw-2Ri6N5W5oxq3X5NrXOAfeFTWpDWcQqxECmxSg_4Df3FZ70x7Fv5CUZiDFW1wiHXqi29YYHEbTMk1XCD4MWjOTlMKJURqOyosgXTdmDdbcbF-Hm5CtCVbId1CKE-p3fyJXl=w828-h827-s-no-gm?authuser=0', {
              caption: `Ты выиграл 1500 монет!`,
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Назад ⏪', callback_data: 'cases' }]
                ]
              }
            });
            userData.currencyCoins += 1500;
            userData.totalCoinsReceived = userData.totalCoinsReceived + 1500;
          } else if (randomNumber < 95) {
            bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczPbgauD8O3DQvMRCALV_gRydYDDzumx1hp_UyktgipWFxqYvd6y_ZrMNn-QkQE6mKA6RQbyf1qZBfnip1ndvuoZVgA2F02dXgSiIH6mV0mCep-Zm7t2ZZA3PCVDKyyVMJW71TmLApgvyXh_57AhD97U=w828-h827-s-no-gm?authuser=0', {
              caption: `Ты выиграл 2500 монет!`,
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Назад ⏪', callback_data: 'cases' }]
                ]
              }
            });
            userData.currencyCoins += 2500;
            userData.totalCoinsReceived = userData.totalCoinsReceived + 2500;
          } else {
            bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczOtchtwquqlkn_b9vvThAwBtQWNRiLhj2pRBZKaZpKx7bTwhPjBrgBw76kD8kB2WmP65aBsNDIx2MquFVV5taXRAU9f16HyOtrQ-xzat7AZZg_6tRdhq6qOtcQuOHMSkuaxTQjk6T1nRfc2MyAPeePC=w828-h827-s-no-gm?authuser=0', {
              caption: `Ты выиграл телеграм премиум на три месяца!`,
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Назад ⏪', callback_data: 'cases' }]
                ]
              }
            });
            userData.itemPremium += 1;
          }
    
          userDataManager.saveUserData(userId, userData);
          bot.answerCallbackQuery(query.id);
        } else {
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, 'У вас недостаточно монет для открытия кейса.');
        }
      } else if (query.data === 'case_dapizda') {
        bot.answerCallbackQuery(query.id);
        bot.sendMessage(chatId, 'Кейс "да пиз**":\n\nСтоимость: 50 монет\n\n' +
          'Возможные призы:\n' +
          '50% - 100 монет\n' +
          '50% - ничего\n' +
          'Выбери действие:',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Открыть кейс', callback_data: 'open_case_dapizda' }],
                [{ text: 'Назад ⏪', callback_data: 'cases' }]
              ]
            }
          });
      } else if (query.data === 'open_case_dapizda') {
        if (userData.currencyCoins >= 50) {
            userData.currencyCoins -= 50;
            const randomNumber = Math.random() * 100;
            let prize = '';
            if (randomNumber < 50) {
                bot.sendMessage(chatId, 'Ты выиграл 100 монет!');
                userData.currencyCoins += 100;
                userData.totalCoinsReceived = userData.totalCoinsReceived + 100;
            } else {
                bot.sendMessage(chatId, 'Ты ничего не выиграл!');
            }
            userDataManager.saveUserData(userId, userData);
            bot.answerCallbackQuery(query.id);
        } else {
            bot.answerCallbackQuery(query.id);
            bot.sendMessage(chatId, 'У вас недостаточно монет для открытия кейса.');
        }
    } else if (query.data === 'case_cosplaybox') {
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(chatId, 'Кейс "Косплей бокс черешни":\n\nСтоимость: 400 монет\n\n' +
          'Возможные призы:\n' +
          '50% - братан удача на нуле, хватит только на ролтон, ты получаешь 150 монет\n' +
          '20% - черешня нагадала что тебе выпало 350 монет, вроде окупился а вроде и мало чет\n' +
          '15% - опа держи цветочек а в нем 500 монет\n' +
          '10% - тебе выпала черешня в тележке, а к ней в придачу 600 монет\n' +
          '4.99% - Поздравляю с луной от GI заврика!!\n' +
          '0.01% - никто не знает что там, но ты можешь узнать если повезет\n\nВыбери действие:',
          {
              reply_markup: {
                  inline_keyboard: [
                      [{ text: 'Открыть кейс', callback_data: 'open_case_cosplaybox' }],
                      [{ text: 'Назад ⏪', callback_data: 'cases' }]
                  ]
              }
          });
    } else if (query.data === 'open_case_cosplaybox') {
      if (userData.currencyCoins >= 400) {
          userData.currencyCoins -= 400;
          const randomNumber = Math.random() * 100;
          let prize = '';
          if (randomNumber < 50) {
              bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczO8Q2SGEC8VsLnJA9XLpo6jBxRRJXX0_6heehHBrTu2xU-GlpHITFRvu8WgWKKiBJR-yhqptPkLHdhyFhQIrxboJ_6RsPo6K2yYX-OQ0qAeAfPNbMWmodS3yltg3nM91jcdU_-0O9_2aHSDlDt0eZ4_=w774-h580-s-no-gm?authuser=0', {
                  caption: `Братан удача на нуле, хватит только на ролтон, ты получаешь 150 монет`,
                  reply_markup: {
                      inline_keyboard: [
                          [{ text: 'Назад ⏪', callback_data: 'cases' }]
                      ]
                  }
              });
              userData.currencyCoins += 150;
              userData.totalCoinsReceived = userData.totalCoinsReceived + 150;
          } else if (randomNumber < 70) {
              bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczPq_axeOPSHI6LQ6KTP4tNsfwWKZUZs87CrqgpMBUf4iR1kMPjkMM_7-rd4J89nvcDN7Q3MWpZq64lUyJFT4P3CBKxbPWc8zg-cJBF28ocIGo67j0H4mdi_Yt_keafPPy2_URwAe81VuVUMj_HG80yu=w435-h580-s-no-gm?authuser=0', {
                  caption: `Черешня нагадала что тебе выпало 350 монет, вроде окупился а вроде и мало чет`,
                  reply_markup: {
                      inline_keyboard: [
                          [{ text: 'Назад ⏪', callback_data: 'cases' }]
                      ]
                  }
              });
              userData.currencyCoins += 350;
              userData.totalCoinsReceived = userData.totalCoinsReceived + 350;
          } else if (randomNumber < 85) {
              bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczPq_axeOPSHI6LQ6KTP4tNsfwWKZUZs87CrqgpMBUf4iR1kMPjkMM_7-rd4J89nvcDN7Q3MWpZq64lUyJFT4P3CBKxbPWc8zg-cJBF28ocIGo67j0H4mdi_Yt_keafPPy2_URwAe81VuVUMj_HG80yu=w435-h580-s-no-gm?authuser=0', {
                  caption: `Опа держи цветочек а в нем 500 монет`,
                  reply_markup: {
                      inline_keyboard: [
                          [{ text: 'Назад ⏪', callback_data: 'cases' }]
                      ]
                  }
              });
              userData.currencyCoins += 500;
              userData.totalCoinsReceived = userData.totalCoinsReceived + 500;
          } else if (randomNumber < 95) {
              bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczPQgOv_huzxKOiJLdqmuHnNvHy0SGCxZ3noCc83dbpCgwvBausQRXv9Q16sYheZL6A11BStBCIsPsyOpCuyRTGZv-S3D5DeEemBCe-It2v2BpMTpl3utP2w3oJwVnOFqP8iNKAqKmc1LPaw-RM7PGbo=w719-h959-s-no-gm?authuser=0', {
                  caption: `Тебе выпала черешня в тележке, а к ней в придачу 600 монет`,
                  reply_markup: {
                      inline_keyboard: [
                          [{ text: 'Назад ⏪', callback_data: 'cases' }]
                      ]
                  }
              });
              userData.currencyCoins += 600;
              userData.totalCoinsReceived = userData.totalCoinsReceived + 600;
          } else if (randomNumber < 99.99) {
              bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczNtPOlV2SdfxseyRQEZ8M6DCmBsrXVo49xxDcGDiYGv9ayUQqlUb2HSLmeWgeUB8i2swLN2HX70eYRAveBEqDjeVtQtlQomPM7IrbnCD9rBilI3HpNPD5Oz1ZN97cvC832P6U-TDP-DKAKGHzgbFJM3=w719-h959-s-no-gm?authuser=0', {
                  caption: `Поздравляю с луной от GI заврика!!`,
                  reply_markup: {
                      inline_keyboard: [
                          [{ text: 'Назад ⏪', callback_data: 'cases' }]
                      ]
                  }
              });
              userData.itemMoon = (userData.itemMoon || 0) + 1;
          } else {
              bot.sendPhoto(chatId, 'https://lh3.googleusercontent.com/pw/AP1GczPq_axeOPSHI6LQ6KTP4tNsfwWKZUZs87CrqgpMBUf4iR1kMPjkMM_7-rd4J89nvcDN7Q3MWpZq64lUyJFT4P3CBKxbPWc8zg-cJBF28ocIGo67j0H4mdi_Yt_keafPPy2_URwAe81VuVUMj_HG80yu=w435-h580-s-no-gm?authuser=0', {
                  caption: `Тебе выпадает 0.01% шанс и тебе выпадает ничего!`,
                  reply_markup: {
                      inline_keyboard: [
                          [{ text: 'Назад ⏪', callback_data: 'cases' }]
                      ]
                  }
              });
          }
          userDataManager.saveUserData(userId, userData);
          bot.answerCallbackQuery(query.id);
      } else {
          bot.answerCallbackQuery(query.id);
          bot.sendMessage(chatId, 'У вас недостаточно монет для открытия кейса.');
      }
    } else if (query.data === 'items') {
        bot.answerCallbackQuery(query.id);
        bot.sendMessage(chatId, 'За выводом писать сюда - @cherii_lal');
    }  else if (query.data === 'help') {
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(chatId, 'За помощью писать сюда - @cherii_lal');
  } 
});

startRewardCheckingProcess(24 * 60 * 60 * 1000);