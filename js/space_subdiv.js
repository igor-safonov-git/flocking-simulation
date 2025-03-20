class SubDiv {
	constructor(width, height, bucketSize) {
		this.width = width;
		this.height = height;
		this.bucketSize = bucketSize;
		this.bucketSizeInv = 1 / bucketSize;

		this.cols = Math.ceil(width * this.bucketSizeInv);
		this.rows = Math.ceil(height * this.bucketSizeInv);

		this.buckets = new Array(this.cols * this.rows);
		for (let i = 0; i < this.buckets.length; i++) {
			this.buckets[i] = [];
		}
	}

	update(item) {
		const x = item.position[0];
		const y = item.position[1];

		const col = Math.floor(x * this.bucketSizeInv);
		const row = Math.floor(y * this.bucketSizeInv);

		if (item.bucketIndex !== undefined) {
			const oldBucket = this.buckets[item.bucketIndex];
			const index = oldBucket.indexOf(item);
			if (index > -1) {
				oldBucket.splice(index, 1);
			}
		}

		const bucketIndex = row * this.cols + col;
		this.buckets[bucketIndex].push(item);
		item.bucketIndex = bucketIndex;
	}

	getNearItems(item) {
		const x = item.position[0];
		const y = item.position[1];

		const col = Math.floor(x * this.bucketSizeInv);
		const row = Math.floor(y * this.bucketSizeInv);

		const nearBuckets = [];

		for (let i = -1; i <= 1; i++) {
			const r = row + i;
			if (r >= 0 && r < this.rows) {
				for (let j = -1; j <= 1; j++) {
					const c = col + j;
					if (c >= 0 && c < this.cols) {
						const bucket = this.buckets[r * this.cols + c];
						if (bucket.length > 0) {
							nearBuckets.push(bucket);
						}
					}
				}
			}
		}

		return nearBuckets;
	}

	debugGrid() {
		if (!DEBUG) return;

		const x = flock[0].position[0];
		const y = flock[0].position[1];

		const col = Math.floor(x * this.bucketSizeInv);
		const row = Math.floor(y * this.bucketSizeInv);

		for (let i = -1; i <= 1; i++) {
			const r = row + i;
			if (r >= 0 && r < this.rows) {
				for (let j = -1; j <= 1; j++) {
					const c = col + j;
					if (c >= 0 && c < this.cols) {
						const bucket = this.buckets[r * this.cols + c];
						if (bucket.length > 0) {
							bucket.forEach(a => {
								a.isNear = true;
							});
						}
					}
				}
			}
		}
	}
}