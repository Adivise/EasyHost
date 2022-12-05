const { BanchoClient } = require("bancho.js");
const { Client } = require("nodesu");
const { convertSeconds } = require("../structures/ConvertTime.js");
const { AutoTeam } = require("../settings/lobby.json");
const { ipc } = require("../settings/config.json");
const fetch = require("node-fetch");

process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const client = new BanchoClient(ipc);

let lobby;

// Memory database console died = no more database
let queue = []; // player list

let skip = []; // skip list
let start = []; // start list
let abort = []; // abort list
let stop = []; // stop list

let red = [];
let blue = [];

client.connect().then(async () => {
	console.log(`[INFO] Bot is online!`);

	const channel = await client.createLobby("Setting up lobby...");
	lobby = channel.lobby;

	await Promise.all([
		lobby.setPassword(AutoTeam.password), 
		lobby.setMods(AutoTeam.mods, AutoTeam.freemod),
		lobby.setName(AutoTeam.name),
		lobby.invitePlayer(ipc.username),
		lobby.setSettings(AutoTeam.team_mode, AutoTeam.win_condition, AutoTeam.size)
	]);
	// setfreemods
	console.log("Lobby Created! Name: " + lobby.name + ", password: " + AutoTeam.password);
	console.log("Multiplayer link: https://osu.ppy.sh/mp/" + lobby.id);

	lobby.on("beatmapId", async (beatmapId) => {
		if (beatmapId == null) return;

		const { beatmaps } = new Client(ipc.apiKey);
		const beatmap = await beatmaps.getByBeatmapId(beatmapId);

		if (beatmap.length == 0) return await getBeatmap();
		if (beatmap[0].mode != AutoTeam.mode) return await getBeatmap();

		channel.sendMessage(`*Details* | [https://osu.ppy.sh//beatmapsets/${beatmap[0].beatmapset_id}#/${beatmap[0].beatmap_id} ${beatmap[0].artist} - ${beatmap[0].title}] | AR: ${beatmap[0].diff_approach} | CS: ${beatmap[0].diff_size} | OD: ${beatmap[0].diff_overall} | HP: ${beatmap[0].diff_drain} | Star Rating: ${parseInt(beatmap[0].difficultyrating).toFixed(2)} ★ | Bpm: ${beatmap[0].bpm} | Length: ${convertSeconds(beatmap[0].total_length)}`);
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
			if (queue.length < 2) return channel.sendMessage("Requires at least 2 players to start match.");

			if (start.includes(message.user.id)) return channel.sendMessage("You already voted to start the game!");
			start.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to start the game! - (${start.length}/${queue.length / 2})`);
			if (start.length == queue.length / 2) {
				start = [];

				channel.sendMessage("!mp start");
			}
		} else if (command === "stop") {
			if (queue.length < 2) return channel.sendMessage("Requires at least 2 players to abort timer.");

			if (stop.includes(message.user.id)) return channel.sendMessage("You already voted to abort timer!");
			stop.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to abort timer! - (${stop.length}/${queue.length / 2})`);
			if (stop.length == queue.length / 2) {
				stop = [];

				channel.sendMessage("!mp aborttimer");
			}
		} else if (command === "abort") {
			if (queue.length < 2) return channel.sendMessage("Requires at least 2 players to abort game.");

			if (abort.includes(message.user.id)) return channel.sendMessage("You already voted to abort the game!");
			abort.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to abort the game! - (${abort.length}/${queue.length / 2})`);
			if (abort.length == queue.length / 2) {
				abort = [];

				channel.sendMessage("!mp abort");
			}
		} else if (command === "skip") { // next queue
			if (queue.length < 2) return channel.sendMessage("Requires at least 2 players to skip beatmap.");

			if (skip.includes(message.user.id)) return channel.sendMessage("You already voted to skip the beatmap!");
			skip.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to skip beatmap! - (${skip.length}/${queue.length / 2})`);
			if (skip.length == queue.length / 2) {
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

			channel.sendMessage(`*Rules* | Star Rating: ${AutoTeam.min_star}* - ${AutoTeam.max_star}* | Mode: ${mode} | Mods: ${AutoTeam.mods.join(", ")} | FreeMod: ${AutoTeam.freemod ? "Allowed" : "Not Allowed"}`);
		} else if (command === "info") {
			channel.sendMessage(`*Info* | Powered by [https://github.com/ThePooN/bancho.js Bancho.js] | Developer by [https://osu.ppy.sh/users/21216709 Suntury] | Source Code: [https://github.com/Adivise/SpaceTime SpaceTime]`);
		} else if (command === "help") {
			channel.sendMessage(`*Commands* | [https://github.com/Adivise/SpaceTime#-auto-team-mode Commands]`);
		}
	});

	lobby.on("playerJoined", async (obj) => {
        if (queue.length === 0) {
			await getMods();
			await getBeatmap();
		}

		console.log("Red: " + red.length + " Blue: " + blue.length);

		// switch push team
		if (red.length > blue.length) {
			console.log("Player: " + obj.player.user.username + " joined Blue Team");

			blue.push(obj.player.user.id);
			channel.sendMessage(`!mp team #${obj.player.user.id} blue`);
		} else if (red.length < blue.length) {
			console.log("Player: " + obj.player.user.username + " joined Red Team");

			red.push(obj.player.user.id);
			channel.sendMessage(`!mp team #${obj.player.user.id} red`);
		} else if (red.length == blue.length) {
			let random = Math.floor(Math.random() * 2);

			if (random == 0) {
				blue.push(obj.player.user.id);
				channel.sendMessage(`!mp team #${obj.player.user.id} blue`);
			} else if (random == 1) {
				red.push(obj.player.user.id);
				channel.sendMessage(`!mp team #${obj.player.user.id} red`);
			}

		}

		queue.push(obj.player.user.id);
	});

	lobby.on("playerChangedTeam", async (obj) => {
		// player change team
		if (obj.team == "Red") {
			if (blue.includes(obj.player.user.id)) channel.sendMessage(`!mp team #${obj.player.user.id} blue`);
		}
		if (obj.team == "Blue") {
			if (red.includes(obj.player.user.id)) channel.sendMessage(`!mp team #${obj.player.user.id} red`);
		}
	});

	lobby.on("playerLeft", async (obj) => {
		if (queue.includes(obj.user.id)) queue.splice(queue.indexOf(obj.user.id), 1);
		if (blue.includes(obj.user.id)) blue.splice(blue.indexOf(obj.user.id), 1);
		if (red.includes(obj.user.id)) red.splice(red.indexOf(obj.user.id), 1);

		if (start.includes(obj.user.id)) start.splice(start.indexOf(obj.user.id), 1);
		if (skip.includes(obj.user.id)) skip.splice(skip.indexOf(obj.user.id), 1);
		if (stop.includes(obj.user.id)) stop.splice(stop.indexOf(obj.user.id), 1);
		if (abort.includes(obj.user.id)) abort.splice(abort.indexOf(obj.user.id), 1);
	});

	lobby.on("matchFinished", async () => {
		await getMods();
		await getBeatmap();
		await clearVotes();
	});

	lobby.on("allPlayersReady", async () => {
		if (queue.length >= 2) {
			channel.sendMessage("!mp start 20");
		}
	});

});

process.on("SIGINT", async () => {
	console.log("Closing lobby and disconnecting...");
	await lobby.channel.sendMessage("!mp close");
	process.exit();
});

async function getBeatmap() {
	const since = AutoTeam.since[Math.floor(Math.random() * AutoTeam.since.length)];
    const response = await fetch(`https://osu.ppy.sh/api/get_beatmaps?k=${ipc.apiKey}&since=${since}`);
	const beatmaps = await response.json();

	let object = Object.values(beatmaps);
	let filter = object.filter(x => x.difficultyrating >= AutoTeam.min_star && x.difficultyrating <= AutoTeam.max_star && x.mode == AutoTeam.mode && x.approved > 0);
	let random = filter[Math.floor(Math.random() * filter.length)];
	
	lobby.channel.sendMessage(`!mp map ${random.beatmap_id} ${AutoTeam.mode}`);
}

async function getMods() {
	const mods = ["HR", "DT", "HD", "EZ", "Freemod", "None"];
	let random = mods[Math.floor(Math.random() * mods.length)];

	lobby.channel.sendMessage(`!mp mods ${random}`);
}

async function clearVotes() {
	start = [];
	skip = [];
	stop = [];
	abort = [];
}
