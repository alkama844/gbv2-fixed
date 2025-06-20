const axios = require("axios");
const moment = require("moment-timezone");
const Canvas = require("canvas");
const fs = require("fs-extra");

Canvas.registerFont(
  __dirname + "/assets/font/BeVietnamPro-SemiBold.ttf", {
    family: "BeVietnamPro-SemiBold"
  });
Canvas.registerFont(
  __dirname + "/assets/font/BeVietnamPro-Regular.ttf", {
    family: "BeVietnamPro-Regular"
  });

function convertFtoC(F) {
  return Math.floor((F - 32) / 1.8);
}
function formatHours(hours) {
  return moment(hours).tz("Asia/Ho_Chi_Minh").format("HH[h]mm[p]");
}

module.exports = {
  config: {
    name: "weather",
    version: "1.2",
    author: "NAFIJ_PRO( MODED )",
    countDown: 5,
    role: 0,
    shortDescription: "Get current & 5-day weather forecast",
    longDescription: "Shows today's and the next 5 days weather forecast for a specific location",
    category: "other",
    guide: {
      en: "{pn} <location>"
    },
    envGlobal: {
      weatherApiKey: "d7e795ae6a0d44aaa8abb1a0a7ac19e4"
    }
  },

  langs: {
    en: {
      syntaxError: "Please enter a location.",
      notFound: "Location not found: %1",
      error: "An error occurred: %1",
      today: "Today's weather in %1\n%2\n🌡 Low - High: %3°C - %4°C\n🌡 Feels like: %5°C - %6°C\n🌅 Sunrise: %7\n🌄 Sunset: %8\n🌃 Moonrise: %9\n🏙️ Moonset: %10\n🌞 Day: %11\n🌙 Night: %12"
    }
  },

  onStart: async function ({ args, message, envGlobal, getLang }) {
    const apikey = envGlobal.weatherApiKey;

    const area = args.join(" ");
    if (!area) return message.reply(getLang("syntaxError"));
    let areaKey, dataWeather, areaName;

    try {
      const response = (await axios.get(`https://api.accuweather.com/locations/v1/cities/search.json?q=${encodeURIComponent(area)}&apikey=${apikey}&language=en-us`)).data;
      if (response.length == 0)
        return message.reply(getLang("notFound", area));
      const data = response[0];
      areaKey = data.Key;
      areaName = data.LocalizedName;
    } catch (err) {
      return message.reply(getLang("error", err.response?.data?.Message || err.message));
    }

    try {
      dataWeather = (await axios.get(`http://api.accuweather.com/forecasts/v1/daily/10day/${areaKey}?apikey=${apikey}&details=true&language=en`)).data;
    } catch (err) {
      return message.reply(getLang("error", err.response?.data?.Message || err.message));
    }

    const dataWeatherDaily = dataWeather.DailyForecasts;
    const today = dataWeatherDaily[0];
    const msg = getLang("today",
      areaName,
      dataWeather.Headline.Text,
      convertFtoC(today.Temperature.Minimum.Value),
      convertFtoC(today.Temperature.Maximum.Value),
      convertFtoC(today.RealFeelTemperature.Minimum.Value),
      convertFtoC(today.RealFeelTemperature.Maximum.Value),
      formatHours(today.Sun.Rise),
      formatHours(today.Sun.Set),
      formatHours(today.Moon.Rise),
      formatHours(today.Moon.Set),
      today.Day.LongPhrase,
      today.Night.LongPhrase
    );

    const bg = await Canvas.loadImage(__dirname + "/assets/image/bgWeather.jpg");
    const canvas = Canvas.createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, bg.width, bg.height);

    let X = 100;
    ctx.fillStyle = "#ffffff";
    const data = dataWeatherDaily.slice(0, 7);
    for (const item of data) {
      const icon = await Canvas.loadImage(`http://vortex.accuweather.com/adc2010/images/slate/icons/${item.Day.Icon}.svg`);
      ctx.drawImage(icon, X, 210, 80, 80);

      ctx.font = "30px BeVietnamPro-SemiBold";
      ctx.fillText(`${convertFtoC(item.Temperature.Maximum.Value)}°C`, X, 366);

      ctx.font = "30px BeVietnamPro-Regular";
      ctx.fillText(`${convertFtoC(item.Temperature.Minimum.Value)}°C`, X, 445);
      ctx.fillText(moment(item.Date).format("DD"), X + 20, 140);

      X += 135;
    }

    const imgPath = `${__dirname}/tmp/weather_${areaKey}.jpg`;
    fs.writeFileSync(imgPath, canvas.toBuffer());

    return message.reply({
      body: msg,
      attachment: fs.createReadStream(imgPath)
    }, () => fs.unlinkSync(imgPath));
  }
};