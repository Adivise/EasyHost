<p align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=EasyHost&fontSize=80&fontAlignY=35&animation=twinkling&fontColor=gradient"/> </a> 
</p>

<p align="center"> 
  <a href="https://discord.gg/SNG3dh3MbR" target="_blank"> <img src="https://discordapp.com/api/guilds/903043706410643496/widget.png?style=banner2"/> </a> 
</p>

<p align="center"> 
  <a href="https://ko-fi.com/nanotect" target="_blank"> <img src="https://ko-fi.com/img/githubbutton_sm.svg"/> </a> 
</p>

## 🚨 Warning
- this bot is still in development (not fully test), so there will be bugs and errors. If you find any, please report them in the [issues](https://github.com/Adivise/SpaceHost/issues)

## 📑 Feature
- [x] 3 in 1 (Rotate, Map, Team and Mods)
- [x] No Database Required
- [x] Lightweight
- [x] Full Customizable
- [x] Easy to use

## 📎 Requirements

- [x] Node.js **[Download](https://nodejs.org/en/download/)**
- [x] osu!Irc **[Get](https://osu.ppy.sh/p/irc)**
- [x] osu!ApiKey **[Guide](https://github.com/ppy/osu-api/wiki)**

## 📚 Installation

```
git clone https://github.com/Adivise/EasyHost
cd EasyHost
npm install
```

<details><summary>📄 Configuration [CLICK ME]</summary>
<p>

## 📄 Configuration

Copy or Rename in `setttings/config.json.example` to `config.json` and fill out the values:

```.json
{
    "ipc": {
        "username": "YOUR_IRC_NAME",
        "password": "YOUR_IRC_PASSWORD",
        "apiKey": "YOUR_APIKEY"
    }
}
```

Lobby Configuration in `settings/lobby.json` (Example):

```.json
{
    "Rotator": {
        "name": "Auto Host | 5* - 8.99* | 15:00 | !info", // Name of the room
        "password": "", // Password of the room
        "mode": 0, // 0 = Standard, 1 = Taiko, 2 = Catch, 3 = Mania
        "win_condition": 0, // 0 = Score, 1 = Accuracy, 2 = Combo, 3 = ScoreV2
        "team_mode": 0, // 0 = Head to Head, 1 = Tag Coop, 2 = Team Vs, 3 = Tag Team Vs
        "size": 16, // Room Size
        "mods": ["None"], // Mods ["None", "Freemod", "HD", "HR", "DT", "NC", "FL", "SO", "PF", "EZ", "NF", "HT", "SD", "RX", "AP", "TD", "V2", "MR"]
        "min_star": 5, // Minimum Star
        "max_star": 8.99, // Maximum Star
        "min_length": 30, // Minimum Length (Second)
        "max_length": 900, // Maximum Length (Second)
        "since": ["2022-01-01", "2021-01-01", "2020-01-01", "2019-01-01", "2018-01-01", "2017-01-01"] // Since when the beatmap was approved (Required)
    }
}
```

After installation or finishes all please use `Start.bat` to start the bot for auto create room working! (`Can run multiple bots at the same time`)

</p>
</details>

## 🔩 Features & Commands

> Note: The default prefix is '!'

#### 💬 **Auto Host Mode**

- Start (!start or !start [seconds]) - Start Match (Host)
- Stop (!stop) - Stop Abort Timer (Host)
- Abort (!abort) - Abort Match (Host)
- Skip (!skip) - Skip Host (Vote, Host) AFK Detected
- Queue (!queue) - Show Host Queue
- Rule (!rule) - Show Lobby Rule
- Info (!info) - Show Bot Info

#### 💬 **Auto Map/Mods Mode**

- Start (!start) - Start Match (Vote)
- Stop (!stop) - Stop Abort Timer (Vote)
- Abort (!abort) - Abort Match (Vote)
- Skip (!skip) - Skip Beatmap (Vote)
- Rule (!rule) - Show Lobby Rule
- Info (!info) - Show Bot Info

#### 💬 **Auto Team Mode** 

- Start (!start) - Start Match (Vote)
- Stop (!stop) - Stop Abort Timer (Vote)
- Abort (!abort) - Abort Match (Vote)
- Skip (!skip) - Skip Beatmap (Vote)
- Rule (!rule) - Show Lobby Rule
- Info (!info) - Show Bot Info

</p>
</details>

## ❣ Contributors

<a href="https://github.com/Adivise/SpaceHost/graphs/contributors">
  <img src="https://contributors-img.web.app/image?repo=Adivise/SpaceHost" />
</a>
