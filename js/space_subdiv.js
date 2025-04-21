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

		// Skip invalid positions (out of bounds)
		if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
			return;
		}

		// Remove from old bucket if it exists
		if (item.bucketIndex !== undefined) {
			const oldBucket = this.buckets[item.bucketIndex];
			if (oldBucket) {
				const index = oldBucket.indexOf(item);
				if (index > -1) {
					oldBucket.splice(index, 1);
				}
			}
		}

		// Add to new bucket
		const bucketIndex = row * this.cols + col;
		
		// Safety check - ensure bucket exists
		if (!this.buckets[bucketIndex]) {
			this.buckets[bucketIndex] = [];
		}
		
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
						const bucketIndex = r * this.cols + c;
						const bucket = this.buckets[bucketIndex];
						
						// Make sure bucket exists and has items
						if (bucket && bucket.length > 0) {
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
		
		// Safety check - ensure flock has agents
		if (!flock || flock.length === 0) return;

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
						const bucketIndex = r * this.cols + c;
						const bucket = this.buckets[bucketIndex];
						
						if (bucket && bucket.length > 0) {
							bucket.forEach(a => {
								if (a) a.isNear = true;
							});
						}
					}
				}
			}
		}
	}
}