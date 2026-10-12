javascript: (async function()
{
	const B_LOGGING = true;
	const B_LOGGING_FULL_STACK = false;

	const BOARD = document.querySelector('table#bingo');

	if (BOARD.dataset.fowExecuted === 'true')
	{
		alert('');
		return;
	}

	const TILES = document.querySelectorAll('.square');
    
	let RAW_GOALS_LIST;
	let GOALS_LIST;
	let NON_SRL_GOALS_LIST;

	let VALID_COLORS = ['orange', 'red', 'blue', 'green', 'purple', 'navy', 'teal', 'brown', 'pink', 'yellow'];
	let COLOR_BUTTONS = {};
	let TILE_OBSERVERS = [];
	let ROOM_SETTINGS_OBSERVER;

	let MIDDLE_SQUARE_MODE = false;
	let STARTING_TIER = 1;
	let TIER_ONE = [];
	let SPEC_MODE = false;

	const GOAL_INFO_LINK = "https://docs.google.com/document/d/1ShaNw5vafJxphqf8lV2QFltVI4T3cpz-kmHzaGDkEcA/edit?usp=sharing";
	const GOALS_LINK = "https://raw.githubusercontent.com/ners-xd/DELTARUNE-Bingosync/refs/heads/ch1-5/assets/goal_list_srl_format.json";
	const NON_SRL_GOALS_LINK = "https://raw.githubusercontent.com/ners-xd/DELTARUNE-Bingosync/refs/heads/ch1-5/assets/goal_list.json";
	const KAWKAW_IMAGE_LINK = "https://cdn.discordapp.com/emojis/1556218387758321714.webp?size=96&animated=true";

	/* custom alert that starts with 'Fog of War → ' */
	function fowAlert(message)
	{
		window.alert('Fog of War → ' + message);
	}

	/* custom prompt that starts with 'Fog of War → ' */
	function fowPrompt(message)
	{
		return window.prompt('Fog of War → ' + message);
	}

	/* state functions */

	function getEnabled()
	{
		if (BOARD.dataset.fowEnabled === 'true') {return true};
		return false;
	}

	function setEnabled(boolean)
	{
		BOARD.dataset.fowEnabled = boolean;
		log('Enabled has been set to', boolean);
	}

	function toggleEnabled()
	{
		const b_new_enabled = !getEnabled();
		setEnabled(b_new_enabled);

		if (b_new_enabled)
		{
			resetFog();

			for (let i = 0; i < 25; i++)
			{
				const observer = TILE_OBSERVERS[i];
				const tile = TILES[i];

				observer.observe(tile, {attributes: true});
			}

			ROOM_SETTINGS_OBSERVER.observe(document.querySelector('#room-settings-container'), {childList: true})
		}
		else
		{
			showAllTiles();
			
			for (const observer of TILE_OBSERVERS)
			{
				observer.disconnect();
			}

			ROOM_SETTINGS_OBSERVER.disconnect()
		}
		
		document.getElementById('fow-toggle').textContent = b_new_enabled ? "Fog of War ON" : "Fog of War OFF";
	}

	function toggleSpectator() {
		SPEC_MODE = !SPEC_MODE;
		resetFog();
		document.getElementById('spectator-toggle').textContent = SPEC_MODE ? "Spectator Mode ON" : "Spectator Mode OFF";
	}

	function updateTierNumber() {
		const input_element = document.getElementById('tier-input')
		
		if (input_element.value > 25) input_element.value = 25;
		else if (input_element.value < 1) input_element.value = 1;
		
		STARTING_TIER = input_element.value;
		log("Starting tier number has been set to " + STARTING_TIER);
		updateStartingTier();
	}

	function selectMiddleSquare() {
		MIDDLE_SQUARE_MODE = !MIDDLE_SQUARE_MODE;
		TIER_ONE = [getTileNumberText(13)];
		
		const toggle_button = document.getElementById("mid-square-btn");  
		if (MIDDLE_SQUARE_MODE) {
			toggle_button.classList.add("chosen-color");
		} else {
			toggle_button.classList.remove("chosen-color");
		}
		toggle_button.blur();

		updateStartingTier();
		log("Middle square mode has been toggled");
	}

	/* tile functions */

	function getTileSlot(tile)
	{
		return Number(tile.id.slice(4));
	}

	function getTileTextContainer(tile)
	{
		const slot_number = getTileSlot(tile);
		const text_container = tile.querySelector('.text-container');
		if (text_container === null)
		{
			log('Tile slot', slot_number, 'does not exist');
		}
		return text_container
	}

	function getTileNumberText(slot_number) {
		const tile = document.getElementById("slot"+slot_number);
		return getTileTextContainer(tile).textContent;
	}

	function getGoalSlotByText(goal_text) {
		for (const tile of TILES) {
			const text_container = tile.querySelector('.text-container');
			if (text_container.innerText === goal_text) {
				return getTileSlot(tile);
			}
		}

		log("Goal " + goal_text + " does not exist on the board.");
		return -1;
	}

	function hideTile(tile)
	{
		const text_container = getTileTextContainer(tile);
		if (text_container === null) {return;}
		text_container.style.opacity = 0;

		/* log('Tile slot', getTileSlot(tile), 'has been hidden'); */
	}

	function hideAllTiles()
	{
		for (const tile of TILES)
		{	

			if (TIER_ONE.includes(tile.innerText)) {showTile(tile);}
			else {hideTile(tile)}
		}

		log('All tiles have been hidden');
	}

	function showTile(tile)
	{
		const text_container = getTileTextContainer(tile);
		if (text_container === null) {return;}
		text_container.style.opacity = 1;

		/* log('Tile slot', getTileSlot(tile), 'has been shown'); */
	}

	function showAllTiles()
	{
		for (const tile of TILES)
		{
			showTile(tile);
		}

		updateFeedMessages();

		log('All tiles have been shown');
	}

	function isTileTicked(tile){
		if (SPEC_MODE){
			return tile.title !== "";
		}
		return tile.title.includes(getColor());
	}

	function isTileNumberTicked(slot_number)
	{
		return isTileTicked(TILES[slot_number - 1]);
	}

	function isSurroundingTileTicked(slot_number) {
		if (slot_number >= 6)      { if (isTileNumberTicked(slot_number - 5)) { return true; } } /* up */
		if (slot_number % 5 !== 0) { if (isTileNumberTicked(slot_number + 1)) { return true; } } /* right */
		if (slot_number <= 20)     { if (isTileNumberTicked(slot_number + 5)) { return true; } } /* down */
		if (slot_number % 5 !== 1) { if (isTileNumberTicked(slot_number - 1)) { return true; } } /* left */

		return false;
	}

	function isTileNumberVisible(slot_number) {
		return isTileNumberTicked(slot_number) || 
		isSurroundingTileTicked(slot_number) || 
		TIER_ONE.includes(getTileNumberText(slot_number)) ||
		!getEnabled();
	}

	function hideIfNoneAround(slot_number) 
	{
		if (TIER_ONE.includes(TILES[slot_number - 1].innerText)) { return; }
		
		if (isTileNumberVisible(slot_number)) return;

		hideTile(TILES[slot_number - 1]);
	}

	function resetAround(slot_number)
	{
		hideIfNoneAround(slot_number); /* self */

		if (slot_number >= 6)      { hideIfNoneAround(slot_number - 5); } /* up */
		if (slot_number % 5 !== 0) { hideIfNoneAround(slot_number + 1); } /* right */
		if (slot_number <= 20)     { hideIfNoneAround(slot_number + 5); } /* down */
		if (slot_number % 5 !== 1) { hideIfNoneAround(slot_number - 1); } /* left */

		log('Tiles around slot', slot_number, 'have been hidden if needed');
	}

	function showAround(slot_number)
	{
		const i = slot_number - 1;
		showTile(TILES[i]); /* self */
		if (slot_number >= 6)    {showTile(TILES[i-5]);} /* up */
		if (slot_number%5 !== 0) {showTile(TILES[i+1]);} /* right */
		if (slot_number <= 20)   {showTile(TILES[i+5]);} /* down */
		if (slot_number%5 !== 1) {showTile(TILES[i-1]);} /* left */

		log('Tiles around slot', slot_number, 'have been shown');
	}

	function updateStartingTier()
	{	
		setTimeout(() => {
			TIER_ONE = MIDDLE_SQUARE_MODE ? TIER_ONE = [getTileNumberText(13)] : GOALS_LIST.slice(0, STARTING_TIER).flat();
			log('The starting objectives have been updated to:', TIER_ONE);
			resetFog();
		}, 20);		
	}

	/* recalculates the fog across the whole board */
	function resetFog()
	{
		if (getEnabled()) {
			log('The fog has been reset');

			hideAllTiles();

			for (const tile of TILES)
			{
				if (isTileTicked(tile)) {showAround(getTileSlot(tile));}
			}
		}
		updateFeedMessages();
	}

	/* color functions */

	function getColor()
	{
		return BOARD.dataset.fowColor;
	}
	
	function setColor(new_color)
	{
		COLOR_BUTTONS[new_color].click();
		log('The color button has been clicked');
	}

	/* listeners and callbacks */

	function tileObserverCallback(mutations)
	{
		const mutation = mutations[0];

		if (mutation.attributeName !== 'title') {return;}

		const slot_number = getTileSlot(mutation.target);

		if (isTileTicked(mutation.target)) {
			showAround(slot_number);
		} else {
			resetAround(slot_number);
		}

		updateFeedMessages();
	}

	function roomSettingsCallback(mutations)
	{
		log('Room settings panel update detected');
		updateStartingTier();
	}

	function colorListener()
	{
		const new_color = this.getAttribute('squarecolor');
		BOARD.dataset.fowColor = new_color;
		log('Color has been set to', new_color);
		resetFog();
	}

	function hideGoalList() {
		const goal_list_input = document.getElementById('id_custom_json');

		if (document.getElementById("hide-list-checkbox").checked) {
			goal_list_input.style = "color: transparent; text-shadow: 0 0 15px rgba(0, 0, 0, 0.8);";
		} else {
			goal_list_input.style = "";
		}
	}
	
	function variantChangeCallback() {
		const variantSelector = document.getElementById('id_variant_type');
		const currentVariant = variantSelector.options[variantSelector.selectedIndex].text;

		const hide_list_checkbox = document.getElementById("hide-list-checkbox");
		const goal_list_input = document.getElementById('id_custom_json');

		switch (currentVariant) {
			case "SRL v5":
				goal_list_input.value = JSON.stringify(RAW_GOALS_LIST);
				hide_list_checkbox.checked = false;
				break;
			case "Randomized":
				goal_list_input.value = JSON.stringify(NON_SRL_GOALS_LIST);
				hide_list_checkbox.checked = false;
				break;
			case "Fixed Board":
				goal_list_input.value = ""
				hide_list_checkbox.checked = true;
				break;
			default:
				goal_list_input.value = ""
				hide_list_checkbox.checked = false;
		}

		hideGoalList();		
	}

	function newCardMenuCallback() {
		if (document.getElementById('hide-list-checkbox') == null) {
			const form = document.getElementById('new-card-form');
			const form_children = Array.from(form.children);

			/* hide list toggle */
			const hide_list_div = document.createElement('div');
			const hide_list_label = document.createElement('label');
			const hide_list_checkbox = document.createElement('input');
			const hide_list_text = document.createTextNode("Blur Goal List");

			hide_list_div.className = "checkbox";

			hide_list_checkbox.id = "hide-list-checkbox";
			hide_list_checkbox.type = "checkbox";
			hide_list_checkbox.addEventListener('change', hideGoalList);

			hide_list_label.appendChild(hide_list_checkbox);
			hide_list_label.appendChild(hide_list_text);
			hide_list_div.appendChild(hide_list_label);

			form_children.at(-1).children[0].appendChild(hide_list_div);

			const variant_type = document.getElementById('id_variant_type');
			variant_type.addEventListener('change', variantChangeCallback);
			variantChangeCallback();
		}
	}

	/* feed functions */
	function getGoalMessageText(goal_entry) {
		return goal_entry.children[0].children[2].textContent;
	}

	function setGoalMessageText(goal_entry, text) {
		const container = goal_entry.children[0];
		const goal = container?.querySelector('.goal-name');
		const isNumber = text[0] === '#';

		const verb = Array.from(container.childNodes).find(
			n => n.nodeType === Node.TEXT_NODE && /\b(marked|cleared)\b/.test(n.textContent)
		)

		verb.textContent = verb.textContent.replace(
			/\b(marked|cleared)(\s+square)?\b/,
      		(_, verb) => isNumber ? `${verb} square` : verb
    	);

		goal.textContent = text;
	}

	function updateFeedMessages() {
		const chat_messages = Array.from(document.querySelectorAll(".new-card-entry, .goal-entry"));
		const last_board = chat_messages.findLastIndex(message => message.className === "new-card-entry");

		let messages_to_update = chat_messages.slice(Math.max(last_board, 0)).filter(message => message.className === "goal-entry");

		for (const goal_message of messages_to_update) {
			const goal_text = getGoalMessageText(goal_message);

			let slot_number;
			if (goal_text[0] === '#') slot_number = Number(goal_text.substring(1));
			else slot_number = getGoalSlotByText(goal_text);
			
			if (isTileNumberVisible(slot_number)) {
				setGoalMessageText(goal_message, getTileNumberText(slot_number));
				log("Updating goal message with number ", slot_number);
			} else {
				setGoalMessageText(goal_message, ("#" + slot_number));
			}
		}
	}

	/* meta */

	async function init()
	{   
        /* get goals list from github, disable if it fails*/
        try {
            const srl_fetch_result = await fetch(GOALS_LINK);
            RAW_GOALS_LIST = await srl_fetch_result.json();

			const no_srl_fetch_result = await fetch(NON_SRL_GOALS_LINK);
			NON_SRL_GOALS_LIST = await no_srl_fetch_result.json();

			GOALS_LIST = RAW_GOALS_LIST.map(tier => tier.map(goal => goal.name));
			log(GOALS_LIST);
            log("Goals list successfully fetched")
			updateStartingTier();
        } catch (e) {
            log(e);
            fowAlert("The goals list could not be fetched, this is likely an issue with GitHub. Please try again later.");
            return;
        }
            
		setEnabled(true);
		log('Fog of War has been enabled.');

		for (const tile of TILES)
		{
			const observer = new MutationObserver(tileObserverCallback);
			observer.observe(tile, {attributes: true});

			TILE_OBSERVERS.push(observer);
		}
		log('Observers have been added to all tiles');

		ROOM_SETTINGS_OBSERVER = new MutationObserver(roomSettingsCallback);
		/* yes it has to be the container, every element below this gets deleted because fucking reasons */
		ROOM_SETTINGS_OBSERVER.observe(document.querySelector('#room-settings-container'), {childList: true});
		log('Observer has been added to the settings');

		const color_elements = document.querySelectorAll('.color-chooser');
		for (let i = 0; i < 10; i++)
		{
			COLOR_BUTTONS[VALID_COLORS[i]] = color_elements[i];
			color_elements[i].addEventListener('click', colorListener);
		}
		log('The COLOR_BUTTONS object has been populated');

		/* custom DR FOW widget */
		const dr_container = document.createElement('div');
		dr_container.id = "DR-FoW-container";

		const dr_widget = document.createElement('div');
		dr_widget.id = "DR-FoW";
		dr_widget.className = "panel panel-default fill-parent";
		dr_container.appendChild(dr_widget);

		const dr_heading = document.createElement('div');
		dr_heading.className = "panel-heading";
		dr_widget.appendChild(dr_heading);

		const dr_title = document.createElement('span');
		dr_title.textContent = "Deltarune Fog of War";
		const dr_collapse = document.createElement('span');
		dr_collapse.id = "dr-collapse";
		dr_collapse.className = "btn btn-default btn-xs pull-right collapse-button";
		dr_collapse.textContent = "-";
		dr_collapse.addEventListener('mousedown', () => $("#dr-body").toggle(50));
		dr_heading.appendChild(dr_title);
		dr_heading.appendChild(dr_collapse);

		const dr_body = document.createElement('div');
		dr_body.id = "dr-body";
		dr_body.className = "panel-body";
		dr_body.style = "display: flex; gap: 10px; justify-content: space-between;";
		dr_widget.appendChild(dr_body);

		/* first column */
		const dr_col1 = document.createElement('div');
		dr_col1.style = "display: flex; flex-direction: column; min-width: 157px; justify-content: space-between; gap: 15px;";

		/* fog of war toggle*/ 
		const dr_fow_toggle = document.createElement('div');
		dr_fow_toggle.id = "fow-toggle";
		dr_fow_toggle.className = "btn btn-default";
		dr_fow_toggle.textContent = "Fog of War ON";
		dr_fow_toggle.addEventListener('click', toggleEnabled);
		dr_col1.appendChild(dr_fow_toggle);

		/* spectator mode toggle*/
		const dr_spectator_toggle = document.createElement('div');
		dr_spectator_toggle.id = "spectator-toggle";
		dr_spectator_toggle.className = "btn btn-default";
		dr_spectator_toggle.style = "margin-top: 15px;"
		dr_spectator_toggle.textContent = "Spectator Mode OFF";
		dr_spectator_toggle.addEventListener('click', toggleSpectator);
		dr_col1.appendChild(dr_spectator_toggle);

		/* second column */
		const dr_col2 = document.createElement('div');
		dr_col2.style = "display: flex; flex-direction: column; justify-content: space-between; gap: 15px;";

		/* starting tier number */
		const tier_div = document.createElement('div');
		const tier_label = document.createElement('label');
		const tier_input = document.createElement('input');
		const tier_input_text = document.createTextNode("Choose starting tier: ");

		tier_input.id = 'tier-input';
		tier_input.style = "text-align: center; padding: 0;";
		tier_input.type = 'number';
		tier_input.step = 1;
		tier_input.min = 1;
		tier_input.max = 25;
		tier_input.value = 1;
		tier_input.addEventListener('change', updateTierNumber);

		tier_label.style = "margin: 0; min-height: 38px; display: flex; align-items: center; gap: 5px;";
		tier_label.appendChild(tier_input_text);
		tier_label.appendChild(tier_input);
		tier_div.appendChild(tier_label);
		dr_col2.appendChild(tier_div);

		/* middle square button */ 
		const mid_square_div = document.createElement('div');
		const mid_square_label = document.createElement('label');
		const mid_square_btn = document.createElement('button');
		const mid_square_text = document.createTextNode("...or ");

		mid_square_btn.id = "mid-square-btn"; 
		mid_square_btn.style = "outline: none; box-shadow: none;";
		mid_square_btn.className = "btn btn-default";
		mid_square_btn.textContent = "Select middle square";
		mid_square_btn.addEventListener('click', selectMiddleSquare);

		mid_square_label.style = "margin: 0; display: flex; align-items: center; gap: 5px;";
		mid_square_label.appendChild(mid_square_text);
		mid_square_label.appendChild(mid_square_btn);
		mid_square_div.appendChild(mid_square_label);
		dr_col2.appendChild(mid_square_div);

		/* third column */
		const dr_col3 = document.createElement('div');
		dr_col3.style = "display: flex; flex-direction: column; justify-content: space-between; gap: 15px; align-items: center";

		/* goal info link */
		const goal_info = document.createElement('div');
		goal_info.id = "goal-info-btn";
		goal_info.className = "btn btn-default";
		goal_info.textContent = "Goal info";
		goal_info.addEventListener('click', () => window.open(GOAL_INFO_LINK, '_blank'));
		dr_col3.appendChild(goal_info);

		/* kawkaw */
		const kawkaw_img = document.createElement('img');
		
		kawkaw_img.src = KAWKAW_IMAGE_LINK;
		kawkaw_img.style = "max-width: 50px";
		dr_col3.appendChild(kawkaw_img);

		/* putting everything together */
		dr_body.appendChild(dr_col1);
		dr_body.appendChild(dr_col2);
		dr_body.appendChild(dr_col3);


		/* new card menu */
		document.getElementById('new-card').addEventListener('click', newCardMenuCallback);

		log('The Fog of War elements have been added to the menu');
		
		document.getElementById('color-chooser').parentElement.appendChild(dr_widget);
		setColor(document.querySelector('.chosen-color').getAttribute('squarecolor'));

		updateFeedMessages();
		log("Past goal messages have been obfuscated");
	}

	/* helpers */

	function log(...data)
	{
		if (!B_LOGGING) {return;}

		const time = '[' + new Date().toLocaleTimeString('pt-BR') + ']';
		const stack_str = new Error().stack.replaceAll(/@.*\s/g, ';').replaceAll(/;+/g, ';');
		const stack_array = stack_str.split(';');
		stack_array.splice(stack_array.indexOf('log'), 1);
		stack_array.pop();
		stack_array.reverse();

		if (!B_LOGGING_FULL_STACK) {stack_array.splice(0, stack_array.length-1);}

		const stack = stack_array.join('() > ') + '() >';
		console.log(time, stack, ...data);
	}

	BOARD.setAttribute('data-fow-executed', 'true');

	await init();

	const enable_message = 'The Gamemode has been ENABLED.';
	fowAlert(enable_message);
})() /* I'll play a game, ping me when you finish */