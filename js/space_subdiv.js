class SubDiv {
	constructor(w, h, s) {
		this.size = s;
		this.buckets = [];
		this.rowLength = Math.ceil(w / s);
		this.count = this.rowLength * Math.ceil(h / s);

		this.grids = [];

		for (let i = 0; i < this.count; i++) {
			this.buckets.push([]);
		}
	}

	update(item) {
		const i = Math.floor(item.position.y / this.size) * this.rowLength + Math.floor(item.position.x / this.size);
		if (i !== item.bucket) {
			if (item.bucket !== undefined) {
				const oldB = this.buckets[item.bucket];
				const ii = item.bucket_index;//oldB.indexOf(item);
				// Remove from the old bucket
				oldB[ii] = oldB[oldB.length - 1]; // It will be replaced with the last item.
				oldB[ii].bucket_index = ii; // update the index.
				oldB.pop(); // And the last item will be removed.
			}
			item.bucket = i;
			item.bucket_index = this.buckets[i].length;
			this.buckets[i].push(item);
		}
	}

	getNearItems(item, dbg = false) {
		this.debug = dbg;

		let all = [];
		// Item is in the center, get the top left corner from the 3x3
		let y = Math.floor(item.bucket / this.rowLength);
		let x = item.bucket - y * this.rowLength;
		let i = item.bucket - 1 - this.rowLength;
		x--;
		y--;
		x *= this.size;
		y *= this.size;

		/**
		 * 00 01 02
		 * X0 X1 X2
		 * Y0 Y1 Y2
		 */
		this.concat(all, i, x, y); // 00
		i++;
		x += this.size;
		this.concat(all, i, x, y); // 01
		i++;
		x += this.size;
		this.concat(all, i, x, y); // 02
		i += this.rowLength - 2;
		x -= this.size + this.size;
		y += this.size;

		this.concat(all, i, x, y); // X0
		i++;
		x += this.size;
		this.concat(all, i, x, y); // X1
		i++;
		x += this.size;
		this.concat(all, i, x, y); // X2
		i += this.rowLength - 2;
		x -= this.size + this.size;
		y += this.size;

		this.concat(all, i, x, y); // Y0
		i++;
		x += this.size;
		this.concat(all, i, x, y); // Y1
		i++;
		x += this.size;
		this.concat(all, i, x, y); // Y2

		return all;
	}

	concat(all, i, x, y) {
		if (x >= 0 && y >= 0 && x < width && y < height) { 			
			all.push(this.buckets[i]); // collect the buckets onnly and iterate on them later - should be faster

			if (this.debug) this.addDebugSquare(x, y);
		}
	}

	debugGrid() {
		if (this.visual === undefined) {
			this.visual = new PIXI.Graphics();
			app.stage.addChild(this.visual);
			
			this.visual.clear();
		}

		this.grids.forEach(g => g.visible = false);
		this.gridIndex = 0;

		this.visual.visible = DEBUG;
	}

	addDebugSquare(x, y) {
		if (this.grids[this.gridIndex] === undefined) {
			const g = this.grids[this.gridIndex] = new PIXI.Graphics();
			app.stage.addChild(g);


		}

		this.grids[this.gridIndex].x = x;
		this.grids[this.gridIndex].y = y;
		this.grids[this.gridIndex].visible = true;
		this.gridIndex++;
	}
}