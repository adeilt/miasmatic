const color_defaults = {
	like_color: "#00FF48",
	dislike_color: "#FF2222",
	neutral_color: "#CCCCCC",
}

function save_colors(){
	let colors = {};

	for (const option_name in color_defaults) {
		colors[option_name] = document.getElementById(option_name).value;
	}

	chrome.storage.sync.set({"colors": colors});
}

function load_data(){
	chrome.storage.sync.get(["user_tags", "options", "colors"], function(response){
		let options = response["options"] ? response["options"] : {};
		let colors = response["colors"] ? response["colors"] : {};
		let user_tags = response["user_tags"] ? response["user_tags"] : {};

		// COLORS
		// if a color preference is unset, set it to default
		for (const color_name in color_defaults) {
			let colors_defaulted = 0;
			if (!(color_name in colors)) {
				colors_defaulted++;
				console.log("Miasmatic: using default color for: " + color_name);
				colors[color_name] = color_defaults[color_name];
			}
			if (colors_defaulted) {
				chrome.storage.sync.set({"colors": color_defaults});
			}
		}

		// configure color UI elements with stored preferences
		for (const color_name in color_defaults) {
			document.getElementById(color_name).value = colors[color_name];
		}

		// TAGS
		let tag_count = 0;
		let list_div = document.getElementById("tag_list_div");
		for (const tag_name in user_tags) {
			// console.log("Miasmatic: processing tag: " + tag_name);
			tag_count++;

			let tag = user_tags[tag_name];

			let tag_span = document.createElement('span');
			tag_span.style.background = colors['neutral_color'];
			if (tag.flag_as == "like") {
				tag_span.classList.add("sidecar_tag_like");
				tag_span.style.background = colors['like_color'];
			}
			if (tag.flag_as == "dislike") {
				tag_span.classList.add("sidecar_tag_dislike");
				tag_span.style.background = colors['dislike_color'];
			}
			tag_span.classList.add("sidecar_tag");
			tag_span.innerText = tag_name;

			list_div.appendChild(tag_span);
			list_div.appendChild(document.createElement('br'));
		}
		console.log("Miasmatic: loaded " + tag_count + " tags.")

		// OPTIONS
		// no non-color, non-tag options yet

		// SETTINGS TRANSPORT
		export_settings();
	});
}

function export_settings() {
	chrome.storage.sync.get(["user_tags", "options", "colors"], function(response){
		let options = response["options"] ? response["options"] : {};
		let colors = response["colors"] ? response["colors"] : {};
		let user_tags = response["user_tags"] ? response["user_tags"] : {};

		document.getElementById("settings_export_text").value = JSON.stringify({
			options: options,
			colors: colors,
			user_tags: user_tags,
		})
	});
}

function display_error(target_id, message, timeout=5000) {
	let target = document.getElementById(target_id);
	if (target.classList.contains('error_span')) {
		target.innerText = message;
		setTimeout(() => { target.innerText = ""; }, timeout);
	}
}

function display_message(target_id, message, timeout=5000) {
	let target = document.getElementById(target_id);
	if (target.classList.contains('message_span')) {
		target.innerText = message;
		setTimeout(() => { target.innerText = ""; }, timeout);
	}
}

document.addEventListener("DOMContentLoaded", function () {
	load_data();

	let save_on_change_except_these = [
		"confirm_reset_tags",
		"reset_tags",
	]

	for(const inp of document.querySelectorAll("input")) {
		if (save_on_change_except_these.indexOf(inp.id) == -1) {
			inp.addEventListener("change", save_colors);
		}

		if (inp.id == "confirm_reset_tags") {
			inp.addEventListener("change", function() {
				document.getElementById("reset_tags").disabled = !inp.checked;
			});
		}

		if (inp.id == "reset_tags") {
			inp.addEventListener("click", function() {
				console.log("Resetting all tags!")
				document.getElementById("confirm_reset_tags").checked = false;
				document.getElementById("reset_tags").disabled = true;
				document.getElementById("tag_list_div").innerHTML = "";
				chrome.storage.sync.remove("user_tags").then(() => {
  					console.log("Tags have been reset!");
				});
			});
		}

		if (inp.id == "confirm_reset_colors") {
			inp.addEventListener("change", function() {
				document.getElementById("reset_colors").disabled = !inp.checked;
			});
		}

		if (inp.id == "reset_colors") {
			inp.addEventListener("click", function() {
				document.getElementById("confirm_reset_colors").checked = false;
				document.getElementById("reset_colors").disabled = true;

				for (const color_name in color_defaults) {
					document.getElementById(color_name).value = color_defaults[color_name];
				}

				chrome.storage.sync.set({"colors": color_defaults});
			});
		}

		if (inp.id == "confirm_import_settings") {
			inp.addEventListener("change", function() {
				document.getElementById("import_settings").disabled = !inp.checked;
			});
		}

		if (inp.id == "import_settings") {
			inp.addEventListener("click", function() {
				console.log("Importing settings!")
				let imported_settings = "BAD";
				try {
					imported_settings = JSON.parse(document.getElementById('settings_import_text').value);
				} catch (e) {
					if (e instanceof SyntaxError) {
						console.log("BAD");
						display_error('import_error', "Error parsing settings data as JSON!");
					}
				}
				if (imported_settings != "BAD") {
					console.log("PARSED");
					if (!('colors' in imported_settings) ||
						!('user_tags' in imported_settings) ||
						!('options' in imported_settings)) {

						console.log("MISSING");
						console.log(imported_settings);
						display_error('import_error', "Missing required items in parsed settings data.");
					} else {
						console.log('IMPORTING');
						console.log(imported_settings);
						let imported = (
							Object.keys(imported_settings.user_tags).length + " tags," +
							Object.keys(imported_settings.colors).length + " colors," +
							Object.keys(imported_settings.options).length + " other options"
						);
						console.log("Importing: " + imported);

						chrome.storage.sync.set({
							colors: imported_settings.colors,
							user_tags: imported_settings.user_tags,
							options: imported_settings.options,
						}).then(() => {
							load_data ();
							display_message('import_message', "Imported: " + imported, 10000);
						});
					}
				}

				document.getElementById("confirm_import_settings").checked = false;
				document.getElementById("import_settings").disabled = true;
				document.getElementById("settings_import_text").value = "";
			});
		}

		if (inp.id == "copy_exported_settings") {
			inp.addEventListener("click", function () {
				navigator.clipboard.writeText(document.getElementById('settings_export_text').value);
				display_message('export_message', "Settings copied.")
			});
		}

	}
});