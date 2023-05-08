const { BanchoClient } = require("bancho.js");
const { Client } = require("nodesu");
const { convertSeconds } = require("../structures/ConvertTime.js");
const { AutoMods } = require("../settings/lobby.json");
const { ipc } = require("../settings/config.json");
const fetch = require("node-fetch");

process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const client = new BanchoClient(ipc);

let lobby;

let queue = []; // player list

let skip = []; // skip list
let start = []; // start list
let abort = []; // abort list
let stop = []; // stop list

client.connect().then(async () => {
	console.log(`[INFO] Bot ${ipc.username} is online!`);
	console.log(`[TIP] You can use *CRTL + C* to close the lobby!`);
	console.log(`[WARN] Don't try exit with click out, the lobby will not close fully`);
	console.log(`[WARN] When you do, you need to join back to the lobby and type !mp close in chat`);

	const channel = await client.createLobby(AutoMods.name);
	lobby = channel.lobby;

	await Promise.all([
		lobby.setPassword(AutoMods.password), 
		lobby.invitePlayer(ipc.username),
		lobby.setSettings(AutoMods.team_mode, AutoMods.win_condition, AutoMods.size)
	]);

	console.log("Lobby Created! Name: " + lobby.name + ", password: " + AutoMods.password);
	console.log("Multiplayer link: https://osu.ppy.sh/mp/" + lobby.id);

	lobby.on("beatmapId", async (beatmapId) => {
		if (beatmapId == null) return;

		const { beatmaps } = new Client(ipc.apiKey);
		const beatmap = await beatmaps.getByBeatmapId(beatmapId);

		if (beatmap.length == 0) return await getBeatmap();
		if (beatmap[0].mode != AutoMods.mode) return await getBeatmap();

		channel.sendMessage(`*Details* | [https://osu.ppy.sh/beatmapsets/${beatmap[0].beatmapset_id}#/${beatmap[0].beatmap_id} ${beatmap[0].artist} - ${beatmap[0].title}] | AR: ${beatmap[0].diff_approach} | CS: ${beatmap[0].diff_size} | OD: ${beatmap[0].diff_overall} | HP: ${beatmap[0].diff_drain} | Star Rating: ${Number(beatmap[0].difficultyrating).toFixed(2)} ★ | Bpm: ${beatmap[0].bpm} | Length: ${convertSeconds(beatmap[0].total_length)}`);
		channel.sendMessage(`*Mirror* | [https://beatconnect.io/b/${beatmap[0].beatmapset_id} BeatConnect] | [https://dl.sayobot.cn/beatmaps/download/novideo/${beatmap[0].beatmapset_id} Sayobot] | [https://api.chimu.moe/v1/download/${beatmap[0].beatmapset_id}?n=1 Chimu]`);

	});

	lobby.channel.on("message", async (message) => {
		const date = new Date();
		const time = date.toLocaleTimeString();
		
		console.log(`[${time}] [DEBUG] ` + message.content);
		
		const prefix = "!"
		if (!message.content.startsWith(prefix)) return;
		const args = message.content.slice(prefix.length).trim().split(/ +/g);
		const command = args.shift().toLowerCase();

		if (command === "start") {
			if (queue.length === 1) return channel.sendMessage("!mp start");

			if (start.includes(message.user.id)) return channel.sendMessage("You already voted to start the game!");
			start.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to start the game! - (${start.length}/${Math.ceil(queue.length / 2)})`);
			if (start.length >= Math.ceil(queue.length / 2)) {
				start = [];

				channel.sendMessage("!mp start");
			}
		} else if (command === "stop") {
			if (queue.length === 1) return channel.sendMessage("!mp aborttimer");

			if (stop.includes(message.user.id)) return channel.sendMessage("You already voted to abort timer!");
			stop.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to abort timer! - (${stop.length}/${Math.ceil(queue.length / 2)})`);
			if (stop.length >= Math.ceil(queue.length / 2)) {
				stop = [];

				channel.sendMessage("!mp aborttimer");
			}
		} else if (command === "abort") {
			if (queue.length === 1) return channel.sendMessage("!mp abort");

			if (abort.includes(message.user.id)) return channel.sendMessage("You already voted to abort the game!");
			abort.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to abort the game! - (${abort.length}/${Math.ceil(queue.length / 2)})`);
			if (abort.length >= Math.ceil(queue.length / 2)) {
				abort = [];

				channel.sendMessage("!mp abort");
			}
		} else if (command === "skip") { // next queue
			if (queue.length === 1) return await getBeatmap();

			if (skip.includes(message.user.id)) return channel.sendMessage("You already voted to skip the beatmap!");
			skip.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to skip beatmap! - (${skip.length}/${Math.ceil(queue.length / 2)})`);
			if (skip.length >= Math.ceil(queue.length / 2)) {
				skip = [];
				await getBeatmap();
			}
		} else if (command === "rule" || command === "rules") {
			let mode = ""
			if (Rotator.mode == 0) {
				mode = "Standard";
			} else if (Rotator.mode == 1) {
				mode = "Taiko";
			} else if (Rotator.mode == 2) {
				mode = "Catch the Beat";
			} else if (Rotator.mode == 3) {
				mode = "Mania";
			}

			channel.sendMessage(`*Rules* | Star Rating: ${AutoMods.min_star}* - ${AutoMods.max_star}* | Mode: ${mode} | Mods: ${AutoMods.mods.join(", ")}`);
		} else if (command === "info") {
			channel.sendMessage(`*Info* | Powered by [https://github.com/ThePooN/bancho.js Bancho.js] | Developer by [https://osu.ppy.sh/users/21216709 Suntury] | Source Code: [https://github.com/Adivise/SpaceHost SpaceHost] | [https://github.com/Adivise/SpaceHost#-features--commands Commands]`);
		}
	});

	lobby.on("playerJoined", async (obj) => {
		if (queue.length === 0) {
			await getBeatmap();
		}
		queue.push(obj.player.user.id);
	});

	lobby.on("playerLeft", async (obj) => {
		queue.splice(queue.indexOf(obj.user.id), 1);
		if (start.includes(obj.user.id)) start.splice(start.indexOf(obj.user.id), 1);
		if (skip.includes(obj.user.id)) skip.splice(skip.indexOf(obj.user.id), 1);
		if (stop.includes(obj.user.id)) stop.splice(stop.indexOf(obj.user.id), 1);
		if (abort.includes(obj.user.id)) abort.splice(abort.indexOf(obj.user.id), 1);
	});

	lobby.on("matchFinished", async () => {
		await getBeatmap();
		await clearVotes();
	});

	lobby.on("allPlayersReady", async () => {
		channel.sendMessage("!mp start 10");
	});

});

process.on("SIGINT", async () => {
	console.log("Closing lobby and disconnecting...");
	await lobby.channel.sendMessage("!mp close");
	process.exit();
});

setInterval(lobbyDummie, 180000); // every 3 minute

function lobbyDummie() { // keep lobby away (will not automatic close)
	if (queue.length === 0) {
		console.log("[DEBUG] LobbyDummie Pinging....");
		getBeatmap();
	}
}

async function getBeatmap() {
    const since = AutoMods.since[Math.floor(Math.random() * AutoMods.since.length)];
    const response = await fetch(`https://osu.ppy.sh/api/get_beatmaps?k=${ipc.apiKey}&since=${since}`);
    const beatmaps = await response.json();

    let object = Object.values(beatmaps);
    let filter = object.filter(x => x.difficultyrating >= AutoMods.min_star && x.difficultyrating <= AutoMods.max_star && x.mode == AutoMods.mode && x.approved > 0);
    let random = filter[Math.floor(Math.random() * filter.length)];
	
	lobby.channel.sendMessage(`!mp map ${random.beatmap_id} ${AutoMods.mode}`);
	getMods();
}

async function getMods() {
	let random = AutoMods.mods[Math.floor(Math.random() * AutoMods.mods.length)];
	lobby.channel.sendMessage(`!mp mods ${random}`);
}

async function clearVotes() {
	start = [];
	skip = [];
	stop = [];
	abort = [];
}
