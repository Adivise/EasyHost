const { BanchoClient } = require("bancho.js");
const { Client } = require("nodesu");
const { convertSeconds } = require("../structures/ConvertTime.js");
const { Rotator } = require("../settings/lobby.json");
const { ipc } = require("../settings/config.json");
const fetch = require("node-fetch");

process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const client = new BanchoClient(ipc);

let lobby;

let queue = []; // player list
let host = 0; // host id
let vote = []; // vote list
let warning = 0; // warning attemp
let lobbyId = 0

client.connect().then(async () => {
	console.log(`[INFO] Bot ${ipc.username} is online!`);
	console.log(`[TIP] You can use *CRTL + C* to close the lobby!`);
	console.log(`[WARN] Don't try exit with click out, the lobby will not close fully`);
	console.log(`[WARN] When you do, you need to join back to the lobby and type !mp close in chat`);

	const channel = await client.createLobby(Rotator.name);
	lobby = channel.lobby;

	lobbyId = lobby.id;

	await Promise.all([
		lobby.setPassword(Rotator.password),
		lobby.invitePlayer(ipc.username),
		lobby.setSettings(Rotator.team_mode, Rotator.win_condition, Rotator.size)
	]);

	console.log("Lobby Created! Name: " + lobby.name + ", password: " + Rotator.password);
	console.log("Multiplayer link: https://osu.ppy.sh/mp/" + lobby.id);
	lobby.channel.sendMessage(`!mp mods ${Rotator.mods.join(" ")}`);

	lobby.on("beatmapId", async (beatmapId) => {
		if (beatmapId == null) return;

		const { beatmaps } = new Client(ipc.apiKey);
		const beatmap = await beatmaps.getByBeatmapId(beatmapId);

		await checkRules(beatmap);

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
			if (host !== message.user.id) return channel.sendMessage("You are not the host!");
			if (args[0]) {
				channel.sendMessage(`!mp start ${args[0]}`);
			} else {
				channel.sendMessage(`!mp start`);
			}
		} else if (command === "stop") {
			if (host !== message.user.id) return channel.sendMessage("You are not the host!");
			channel.sendMessage(`!mp aborttimer`);
		} else if (command === "abort") {
			if (host !== message.user.id) return channel.sendMessage("You are not the host!");
			channel.sendMessage(`!mp abort`);
		} else if (command === "skip") { // next queue
			if (host == message.user.id) {
				if (queue.length == 1) return channel.sendMessage("No players to host!");
				// host to next player
				lobby.setHost("#" + queue[1]);
				// return
				return;
			}

			// check if host Afk will change the host
			const user = await client.getUserById(host);
			if(user.stats == "Afk") {
				lobby.setHost("#" + queue[1]);
				lobby.kickPlayer("#" + host);
				return;
			}

			if (vote.includes(message.user.id)) return channel.sendMessage("You already voted!");
			vote.push(message.user.id);

			channel.sendMessage(`[https://osu.ppy.sh/users/${message.user.id} ${message.user.username}] Voted to skip host! - (${vote.length}/${Math.ceil(queue.length / 2)})`);

			if (vote.length >= Math.ceil(queue.length / 2)) {
				lobby.channel.sendMessage("Host are skipped!");
				// remove vote
				vote = [];
				// host to next player
				lobby.setHost("#" + queue[1]);
			}
		} else if (command === "queue" || command === "q") {
			const strArray = [];
			for (let i = 0; i < queue.length; i++) {
				const user = await client.getUserById(queue[i]);
				strArray.push(`${i + 1}. [https://osu.ppy.sh/users/${user.id} ${user.username}]`);
			}
			channel.sendMessage(`Host Queue: ${strArray.join(", ")}`);
		} else if (command === "rule" || command === "rules") {
			// get mode 0 = osu!standard 1 = taiko 2 = ctb 3 = mania
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

			channel.sendMessage(`*Rules* | Star Rating: ${Rotator.min_star}* - ${Rotator.max_star}* | Length: ${convertSeconds(Rotator.min_length)} - ${convertSeconds(Rotator.max_length)} | Mode: ${mode} | Mods: ${Rotator.mods.join(", ")}`);
		} else if (command === "info") {
			channel.sendMessage(`*Info* | Powered by [https://github.com/ThePooN/bancho.js Bancho.js] | Developer by [https://osu.ppy.sh/users/21216709 Suntury] | Source Code: [https://github.com/Adivise/SpaceHost SpaceHost] | [https://github.com/Adivise/SpaceHost#-features--commands Commands]`);
		}
	});

	lobby.on("name", async (name) => { // will check only when map finish
		if (name !== Rotator.name) {
			channel.sendMessage(`!mp name ${Rotator.name}`);
		}
	});

	lobby.on("winCondition", async (winCondition) => { // will check only when map finish
		if (winCondition !== 0) {
			channel.sendMessage(`!mp set ${Rotator.team_mode} ${Rotator.win_condition} ${Rotator.size}`);
		}
	});

	lobby.on("teamMode", async (teamMode) => { // will check only when map finish
		if (teamMode !== 0) {
			channel.sendMessage(`!mp set ${Rotator.team_mode} ${Rotator.win_condition} ${Rotator.size}`);
		}
	});

	lobby.on("freemod", async (freemod) => { // will check only on apply global mods when map finish
		if (freemod === false) {
			channel.sendMessage(`!mp mods ${Rotator.mods.join(" ")}`);
		}
	});

	lobby.on("playerJoined", async (obj) => {
		// add player to queue
		queue.push(obj.player.user.id);
		// if no host set host
		if (host === 0) {
			lobby.setHost("#" + obj.player.user.id);
		}
	});

	lobby.on("playerLeft", async (obj) => {
		if (vote.includes(obj.user.id)) vote.splice(vote.indexOf(obj.user.id), 1);
		if (obj.user.id === host) { // host left = next host
			queue.splice(queue.indexOf(obj.user.id), 1);
			if (queue.length > 0) {
				lobby.setHost("#" + queue[0]);
				host = queue[0];
			}
			host = 0;
		} else { // player left = remove from queue
			queue.splice(queue.indexOf(obj.user.id), 1);
		}
		if (queue.length === 0) {
			console.log("[DEBUG] Update Settings");
			await updateSettings();
		}
	});

	lobby.on("matchFinished", async () => {
		// read queue default
		const strArray = [];
		for (let i = 0; i < queue.length; i++) {
			const user = await client.getUserById(queue[i]);
			strArray.push(`[https://osu.ppy.sh/users/${user.id} ${user.username}]`);
		}
		const firstElement = strArray.shift(); // Remove the first element from strArray and store it
		strArray.push(firstElement); // Add the first element to the end of strArray
		channel.sendMessage(`Host Queue: ${strArray.join(", ")}`);

		// update settings
		await updateSettings();

		if (queue.length === 1) return;
		// host to next player
		lobby.setHost("#" + queue[1]);
	});

	lobby.on("allPlayersReady", async () => {
		if (queue.length === 1) return; // remove this if your need 1 player can start
		channel.sendMessage("!mp start");
	});

	lobby.on("host", async (obj) => {
		// event host update
		if (obj === null) return;
		if (queue.includes(obj.user.id)) {
			console.log("[DEBUG] Host Updated!");
			// set host
			host = obj.user.id;
			// shift host to last element
			queue.push(queue[0]);
			// remove first element
			queue.shift();
			// get host to first element
		 	queue.unshift(queue.splice(queue.indexOf(obj.user.id), 1)[0]);
		}
		warning = 0;
	});

});

process.on("SIGINT", async () => {
	console.log("Closing lobby and disconnecting...");
	await lobby.channel.sendMessage("!mp close");
	process.exit();
});

setInterval(async () => {
	await lobbyDummie();
}, 180000);

async function lobbyDummie() { // keep lobby away (will auto create room)
	if (queue.length === 0) { // nobody in lobby = pinging
		const client = new BanchoClient(ipc);
		client.connect().then(async () => {
			const channel = client.getChannel("#mp_" + lobbyId);
			try { // when can join room
				await channel.join();
				console.log("[DUMMIE] The Room is alive.");
				await getBeatmap();
				client.disconnect();
			} catch (err) { // when cannot join room
				console.log("[DUMMIE] The Room is dead.");
				client.disconnect();
				process.exit(); // work with use start.bat
			}
		})
	}
}

async function updateSettings() {
	// clear vote
	vote = [];
	// delay
	await delay(2000);
	// send message
	lobby.channel.sendMessage(`!mp settings`);
	lobby.channel.sendMessage(`!mp password ${Rotator.password}`);
}

function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBeatmap() {
    const since = Rotator.since[Math.floor(Math.random() * Rotator.since.length)];
    const response = await fetch(`https://osu.ppy.sh/api/get_beatmaps?k=${ipc.apiKey}&since=${since}`);
    const beatmaps = await response.json();

    let object = Object.values(beatmaps);
    let filter = object.filter(x => x.difficultyrating >= Rotator.min_star && x.difficultyrating <= Rotator.max_star && x.mode == Rotator.mode && x.approved > 0);
    let random = filter[Math.floor(Math.random() * filter.length)];
	
	lobby.channel.sendMessage(`!mp map ${random.beatmap_id} ${Rotator.mode}`);
}

async function checkRules(beatmap) {
	if (beatmap.length == 0) return getRules("Beatmap not found!");
	if (beatmap[0].mode != Rotator.mode) return getRules("Beatmap mode is not *Standard*");
	if (beatmap[0].difficultyrating > Rotator.max_star) return getRules("Beatmap *Star Rating* is too high");
	if (beatmap[0].difficultyrating < Rotator.min_star) return getRules("Beatmap *Star Rating* is too low");
	if (beatmap[0].total_length > Rotator.max_length) return getRules("Beatmap *Length* is too long");
	if (beatmap[0].total_length < Rotator.min_length) return getRules("Beatmap *Length* is too short");
}

async function getRules(reason) {
	warning++

	lobby.channel.sendMessage(`*Warning* | [https://osu.ppy.sh/users/${lobby.getHost().user.id} ${lobby.getHost().user.username}] | Reason: ${reason} | Attempt remaining: (${warning}/3)`);
	lobby.channel.sendMessage(`*Rules* | Star Rating: ${Rotator.min_star}* - ${Rotator.max_star}* | Length: ${convertSeconds(Rotator.min_length)} - ${convertSeconds(Rotator.max_length)} | Mode: Standard | Mods: ${Rotator.mods.join(", ")}`);

	if (warning === 3) {
		if (queue.length == 1) return lobby.kickPlayer("#" + host);
		lobby.setHost("#" + queue[1]);
		warning = 0;
	}

	getBeatmap();
}