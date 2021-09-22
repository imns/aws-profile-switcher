const path = require("path");
const fs = require("fs");
// require("electron-reload")(__dirname, {
// 	electron: path.join(__dirname, "node_modules", ".bin", "electron"),
// 	// hardResetMethod: "exit",
// });
const ini = require("ini");
const { app, Menu, Tray, shell } = require("electron");
const { menubar } = require("menubar");

// Tray
const iconPath = path.join(__dirname, "assets", "iam-icon.png");

const CREDENTIALS_FILENAME = "credentials";
const CONFIGS_FILENAME = "configs";

/*

	TODO
		- Create a copy of the original credentials file and save it as a 
		  backup.
		- Check if the default profile is not a named profile and ask the
		  user to rename it.  That way the default doesn't get overwritten.
		- Set the ENV variables for the selected profile
*/

app.on("ready", main);

// In memory cache
let tray;
let credentials;
let defaultProfile = {};
let configs;

function getFile(filename) {
	const filePath = path.join(app.getPath("home"), ".aws", filename);
	const credsFile = fs.readFileSync(filePath, { encoding: "utf8" });
	return JSON.parse(JSON.stringify(ini.parse(credsFile)));
}

function loadCredentials() {
	credentials = getFile(CREDENTIALS_FILENAME);

	if (credentials.hasOwnProperty("default")) {
		defaultProfile = credentials.default;
		delete credentials.default;
	}
}

function loadConfigs() {
	configs = getFile(CONFIGS_FILENAME);
}

function handleSelect({ id = null, label }) {
	credentials.default = credentials[label];

	const writePath = path.join(app.getPath("home"), ".aws", CREDENTIALS_FILENAME);
	fs.writeFileSync(writePath, ini.stringify(credentials));
}

function setContextMenuForTray() {
	const labels = Object.keys(credentials);
	const menuItems = labels.map((label) => {
		let checked = credentials[label].aws_access_key_id === defaultProfile.aws_access_key_id;

		return { label, type: "radio", click: handleSelect, checked };
	});
	const contextMenu = Menu.buildFromTemplate([
		...menuItems,
		{ type: "separator" },
		{ label: "Open file", type: "normal", click: openInFinder },
		{ label: "Refresh Profiles", type: "normal", click: refreshProfiles },
		{ label: "Quit", role: "quit", type: "normal" },
	]);
	tray.setContextMenu(contextMenu);
}

function refreshProfiles(e) {
	loadCredentials();
	setContextMenuForTray();
}

function openInFinder() {
	shell.showItemInFolder(path.join(app.getPath("home"), ".aws", CREDENTIALS_FILENAME));
}

function main() {
	loadCredentials();

	if (!credentials) {
		console.error("credentials file did not load");
	}

	tray = new Tray(iconPath);
	setContextMenuForTray();

	const mb = menubar({
		tray,
	});
	mb.app.commandLine.appendSwitch("disable-backgrounding-occluded-windows", "true");

	mb.on("ready", () => {
		// mb.window.hide();
		//  mb.hideWindow();
		tray.removeAllListeners();
	});
}
