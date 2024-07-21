document.getElementById('scanButton').addEventListener('click', () => {
    const imageInput = document.getElementById('imageInput');
    if (imageInput.files.length === 0) {
        alert('Please select an image.');
        return;
    }
    
    document.getElementById('progressBarContainer').classList.remove('hidden');
    let text1Div = document.getElementById('text1');
    text1Div.innerHTML = '';
    const file = imageInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const imgElement = document.getElementById('imageDisplay');
        imgElement.src = e.target.result;

        Tesseract.recognize(
            e.target.result,
            'eng',
            {
                logger: m => {
                    console.log(m);
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        updateProgressBar(progress);
                    }
                }
            }
        ).then(({ data: { text, blocks } }) => {
            console.log("Recognized text:", text);
            processText(text, blocks, file);
        }).catch(err => {
            console.error("Error during text recognition:", err);
        });
    };
    reader.readAsDataURL(file);
    text1Div.innerHTML=`<input value='${text}'>`
});

function updateProgressBar(progress) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = progress + '%';
}

function processText(text, blocks, file) {
    const itemNoPatterns = [
        /Item\s*No\s*[:\-]?\s*(\S+)/i,
        /item\s*no\s*[:\-]?\s*(\S+)/i,
        /Jtem\s*"lo\s*[:\-]?\s*(\S+)/i,
        /tem\s*no\s*[:\-]?\s*(\S+)/i
    ];
    const pnPatterns = [
        /P\/?N\s*(\S+)\s*(\S+)/i,
        /P\/?N\s*[:\-]?\s*(\S+)/i,
        /p\s*\/?\s*n\s*[:\-]?\s*(\S+)/i,
        /P\s*\/?\s*N\s*[:\-]?\s*(\S+)/i,
        /p\s*n\s*[:\-]?\s*(\S+)/i,
        /PIN\s*[:\-]?\s*(\S+)/i,
        />\s*\/?\s*N\s*[:\-]?\s*(\S+)/i
    ];

    let itemNoMatch = findFuzzyMatch(text, itemNoPatterns);
    let pnMatch = findFuzzyMatch(text, pnPatterns);

    if (!itemNoMatch || !pnMatch) {
        const lines = text.split('\n');
        let itemNoIndex = -1;
        let pnIndex = -1;

        lines.forEach((line, index) => {
            if (itemNoPatterns.some(pattern => pattern.test(line))) {
                itemNoMatch = line.match(itemNoPatterns.find(pattern => pattern.test(line)))[1];
                itemNoIndex = index;
            }
            if (pnPatterns.some(pattern => pattern.test(line))) {
                pnMatch = line.match(pnPatterns.find(pattern => pattern.test(line)))[1];
                pnIndex = index;
            }
        });

        if (pnMatch && itemNoIndex === -1 && pnIndex > 0) {
            const precedingLine = lines[pnIndex - 1];
            itemNoMatch = findFuzzyMatch(precedingLine, itemNoPatterns);
        }

        if (itemNoMatch && pnIndex === -1 && itemNoIndex >= 0) {
            const succeedingLines = lines.slice(itemNoIndex + 1);
            pnMatch = findFuzzyMatch(succeedingLines.join('\n'), pnPatterns);
        }
    }

    pnMatch = cleanText(pnMatch);

    console.log("Item NO match:", itemNoMatch);
    console.log("P/N match:", pnMatch);

    let resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (itemNoMatch) {
        resultsDiv.innerHTML += `<p><strong>Item NO:</strong> <input type="text" id="itemNoInput" value="${itemNoMatch}"></p>`;
    } else {
        resultsDiv.innerHTML += `<p><strong>Item NO:</strong> <input type="text" id="itemNoInput" placeholder="Not found"></p>`;
    }

    if (pnMatch) {
        resultsDiv.innerHTML += `<p><strong>P/N:</strong> <input type="text" id="pnInput" value="${pnMatch}"></p>`;
    } else {
        resultsDiv.innerHTML += `<p><strong>P/N:</strong> <input type="text" id="pnInput" placeholder="Not found"></p>`;
    }

    if (itemNoMatch || pnMatch) {
        document.getElementById('submitButton').classList.remove('hidden');
        document.getElementById('submitButton').addEventListener('click', () => {
            uploadImageToDrive(file, pnMatch);
        });
    } else {
        document.getElementById('submitButton').classList.add('hidden');
    }
}

function findFuzzyMatch(text, patterns) {
    const lines = text.split('\n');
    for (let line of lines) {
        for (let pattern of patterns) {
            const match = line.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
    }
    return null;
}

function cleanText(text) {
    if (text) {
        return text.replace(/[^a-zA-Z0-9]/g, '');
    }
    return text;
}

function uploadImageToDrive(imageFile, pn) {
    if (!pn) {
        alert('P/N not found. Cannot upload image.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Image = e.target.result.split(',')[1]; // Get the base64 part of the DataURL

        const formData = new FormData();
        formData.append('imageFile', base64Image);
        formData.append('fileName', `${pn}.png`);

        const serverUrl = 'https://script.google.com/macros/s/your-deployment-key/exec';

        fetch(serverUrl, {
            method: 'POST',
            body: formData,
        })
        .then(response => response.text())
        .then(result => {
            console.log(result); // Success message from server
            alert('Image uploaded successfully!');
        })
        .catch(error => {
            console.error('Network error:', error);
            alert('Error uploading image.');
        });
    };
    reader.readAsDataURL(imageFile);
}