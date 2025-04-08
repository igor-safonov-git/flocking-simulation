// Minimal UI Functions, inspired by p5.js
function createSlider(min, max, value, step, cls) {
	const elt = document.createElement('input');
	elt.className = cls;
	elt.type = 'range';
	elt.min = min;
	elt.max = max;
	if (step === 0) {
		elt.step = 0.000000000000000001; // smallest valid step
	} else if (step) {
		elt.step = step;
	}
	if (typeof value === 'number') elt.value = value;
	document.body.appendChild(elt);

	return elt
}

function createDiv(label, cls) {
	const elt = document.createElement('div');
	elt.innerText = label;
	elt.className = cls;
	document.body.appendChild(elt);
	return elt;
}

function createCheckbox(text, v, cls) {
	const elt = document.createElement('div');
	elt.className = cls;
	const checkbox = document.createElement('input');
	checkbox.type = 'checkbox';
	elt.appendChild(checkbox);
	
	document.body.appendChild(elt);
	
	elt.checked = function() {
	  const cb = elt.getElementsByTagName('input')[0];
	  return cb.checked;
	};

	elt.changed = function(f) {
		const cb = elt.getElementsByTagName('input')[0];
		cb.onclick = function() {
			f();
		}
	}

	const ran = Math.random().toString(36).slice(2);
	const label = document.createElement('label');
	checkbox.setAttribute('id', ran);
	label.htmlFor = ran;

	label.appendChild(document.createTextNode(text));
	elt.appendChild(label);
	
	checkbox.checked = v === true;

	return elt;
}
