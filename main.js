window.onload = function() {
    const imageInput = document.getElementById('imageInput');
    const generateButton = document.getElementById('generateButton');

    generateButton.addEventListener('click', function() {
        const file = imageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.src = event.target.result;
                img.onload = function() {
                    generateArt(img);
                };
            };
            reader.readAsDataURL(file);
        }
    });
};

function generateArt(img) {
    const canvas = document.getElementById('outputCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled= false;

    const xLength = Number(document.getElementById('xLength').value);
    const yLength = Number(document.getElementById('yLength').value);

    const newImg = resizeImage(img, 120);
    newImg.onload = () => {
        canvas.width = newImg.width * xLength;
        canvas.height = newImg.height * yLength;


        const [idxi8, pallette] = quantImg(newImg);
        const imageData = createImageData(idxi8, ctx, newImg.width, newImg.height);

        const colorList = (function (arr, n) {
            const result = [];
            for (let i = 0; i < arr.length; i += n) {
                const chunk = arr.slice(i, i + n);
                result.push(chunk);
            }
            return result;
        }(pallette, 4));

        for (let x = 0; x < xLength; x++) {
            for (let y = 0; y < yLength; y++) {
                const colorChangedImgData = changeColor(imageData, ctx, colorList, newImg.width, newImg.height);
                ctx.putImageData(colorChangedImgData, x * newImg.width, y * newImg.height);
            }
        }
    }
}

function changeColor(imgData, ctx, colorList, width, height) {
    const colorChangedUint8Array = new Uint8ClampedArray(imgData.data.length);
    
    const randomColorList = (function (arr) {
        const result = [];
        for (let i = 0; i < arr.length; i++) {
            const color = arr[i];
            const randomColor = [
                Math.floor(Math.random() * 256),
                Math.floor(Math.random() * 256),
                Math.floor(Math.random() * 256),
                color[3]
            ];
            result.push(randomColor);
        }
        return result;
    })(colorList);

    for (let i = 0; i < imgData.data.length; i += 4) {
        const r = imgData.data[i];
        const g = imgData.data[i + 1];
        const b = imgData.data[i + 2];
        const a = imgData.data[i + 3];

        // Find the closest color in the color map
        const colorIndex = colorList.findIndex(color => colorMatches([r, g, b], color));
        if (colorIndex !== -1) {
            colorChangedUint8Array[i] = randomColorList[colorIndex][0];
            colorChangedUint8Array[i + 1] = randomColorList[colorIndex][1];
            colorChangedUint8Array[i + 2] = randomColorList[colorIndex][2];
            colorChangedUint8Array[i + 3] = a; // Preserve alpha
        }
    }

    return createImageData(colorChangedUint8Array, ctx, width, height);
}

function colorMatches(color1, color2) {
    return color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2];
}

function createImageData(idxi8, ctx, width, height) {
    var idxi32 = new Uint32Array(idxi8.buffer);
    
    var imageData = ctx.createImageData(width, height);

	if (typeof(imageData.data) == "CanvasPixelArray") {
		var data = imageData.data;
		for (var i = 0, len = data.length; i < len; ++i)
			data[i] = idxi8[i];
	}
	else {
		var buf32 = new Uint32Array(imageData.data.buffer);
		buf32.set(idxi32);
	}
    return imageData;
}

function resizeImage(img, maxLength) {
    let newWidth, newHeight;
    if (img.width > img.height) {
        newWidth = maxLength;
        newHeight = Math.floor((img.height / img.width) * maxLength);
    } else {
        newHeight = maxLength;
        newWidth = Math.floor((img.width / img.height) * maxLength);
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled= false;

    canvas.width = newWidth;
    canvas.height = newHeight;

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Get the resized image as a Data URL
    const resultImg = new Image();
    resultImg.src = canvas.toDataURL('image/png');
    resultImg.width = newWidth;
    resultImg.height = newHeight;
    resultImg.naturalWidth = newWidth;
    resultImg.naturalHeight = newHeight;
    return resultImg;
}

function quantImg(img) {
    // options with defaults (not required)

    const colors = Number(document.getElementById('colorCount').value);
    var opts = {
        colors: colors,             // desired palette size
        method: 2,               // histogram method, 2: min-population threshold within subregions; 1: global top-population
        boxSize: [64,64],        // subregion dims (if method = 2)
        boxPxls: 2,              // min-population threshold (if method = 2)
        initColors: 4096,        // # of top-occurring colors  to start with (if method = 1)
        minHueCols: 0,           // # of colors per hue group to evaluate regardless of counts, to retain low-count hues
        dithKern: null,          // dithering kernel name, see available kernels in docs below
        dithDelta: 0,            // dithering threshhold (0-1) e.g: 0.05 will not dither colors with <= 5% difference
        dithSerp: false,         // enable serpentine pattern dithering
        palette: [],             // a predefined palette to start with in r,g,b tuple format: [[r,g,b],[r,g,b]...]
        reIndex: false,          // affects predefined palettes only. if true, allows compacting of sparsed palette once target palette size is reached. also enables palette sorting.
        useCache: true,          // enables caching for perf usually, but can reduce perf in some cases, like pre-def palettes
        cacheFreq: 10,           // min color occurance count needed to qualify for caching
        colorDist: "euclidean",  // method used to determine color distance, can also be "manhattan"
    };

    var q = new RgbQuant(opts);

    // analyze histograms
    q.sample(img);

    // build palette
    var pal = q.palette();

    // reduce images
    var outA = q.reduce(img)
    return [outA, pal];
}
