const fs = require('fs');
const path = require('path');

class UserDataManager {
  constructor() {
    this.usersDir = path.join(__dirname, 'users');

    if (!fs.existsSync(this.usersDir)) {
      fs.mkdirSync(this.usersDir);
    }
  }

  loadUserData(userId) {
    try {
      const userDataPath = path.join(this.usersDir, `${userId}.json`);
      if (fs.existsSync(userDataPath)) {
        const data = fs.readFileSync(userDataPath);
        return JSON.parse(data);
      } else {
        const defaultUserData = {
          userId: userId,
          userName: null,
          currencyCoins: 0,
          currencyStars: 0,
          itemMoon: 0,
          itemPass: 0,
          itemPremium: 0,
          coinsReceived: 0,
          starsSpent: 0
        };
        this.saveUserData(userId, defaultUserData);
        return defaultUserData;
      }
    } catch (err) {
      console.error(`Ошибка при загрузке данных пользователя ${userId}:`, err.message);
      return null;
    }
  }

  saveUserData(userId, userData) {
    try {
      const userDataPath = path.join(this.usersDir, `${userId}.json`);
      fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
    } catch (err) {
      console.error(`Ошибка при сохранении данных пользователя ${userId}:`, err.message);
    }
  }

  getAllUserIds() {
    const userFiles = fs.readdirSync('./users');
    const userIds = userFiles.map(fileName => fileName.replace('.json', ''));
  
    return userIds;
  }
}

module.exports = UserDataManager;