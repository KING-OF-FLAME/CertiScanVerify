document.addEventListener('DOMContentLoaded', () => {
    // --- Global Variables & Configuration --- //
    const singleNameInput = document.getElementById('singleName');
    const multipleNamesInput = document.getElementById('multipleNames');
    const csvFileInput = document.getElementById('csvFile');
    const templateSelect = document.getElementById('templateSelect');
    const generateButton = document.getElementById('generateButton');
    const previewCanvas = document.getElementById('previewCanvas');
    const ctx = previewCanvas.getContext('2d');
    const downloadButtonsDiv = document.getElementById('downloadButtons');
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    const downloadImageButton = document.getElementById('downloadImageButton');
    const certificateListDiv = document.getElementById('certificateList');
    const generatedListSection = document.getElementById('generatedListSection');
    const processingMessage = document.getElementById('processingMessage');
    const currentPreviewNameEl = document.getElementById('currentPreviewName');
    const currentPreviewIdEl = document.getElementById('currentPreviewId');

    let currentInputType = 'single'; // 'single', 'multiple', 'csv'
    let generatedCertificatesData = []; // To store data for all generated certs
    let currentlyPreviewedCertificate = null; // To hold data of the certificate in main preview

    // --- PDF.js Worker Configuration --- //
    if (window.pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } else {
        console.error("pdf.js library not loaded!");
        alert("Error: pdf.js library not loaded. Please check your internet connection or CDN link.");
        if(processingMessage) processingMessage.style.display = 'none';
        if(generateButton) generateButton.disabled = true;
        return; // Stop execution if pdf.js is not available
    }
    
    // --- Helper functions for unit conversions --- //
    const DPI = 150; // Reference DPI for calculations
    const inchToPx = (inches) => inches * DPI;
    const ptToPx = (points) => (points / 72) * DPI; // 1 point = 1/72 inch

    // --- IMPORTANT: Template Configuration --- //
    const templateConfigs = {
        'completion': {
            name: {
                // CRITICAL: YOU MUST ADJUST 'y' and 'x_center_line' for YOUR PDF.
                // 'y': Baseline of name, below "CERTIFICATE OF COMPLETION" title.
                // 'x_center_line': Horizontal center of "CERTIFICATE OF COMPLETION" title.
                y: 480, // EXAMPLE PLACEHOLDER - ADJUST!
                x_center_line: 590, // EXAMPLE PLACEHOLDER - ADJUST!
                textAlign: 'center', // Name will be centered
                fontSize: ptToPx(40),
                font: `bold ${ptToPx(40)}px "Times New Roman", serif`, // Large, bold, elegant
                color: '#000000',
                maxWidth: 700 // Adjust if names get too wide for the space under title
            },
            date: { 

                fontSize: ptToPx(10), // Font size for date
                font: `${ptToPx(10)}px Helvetica, sans-serif`,
                color: '#333333',
                // Offsets for dynamic placement relative to QR code (bottom-left QR assumed)
                // Date will be slightly right of QR's left edge, and below QR's bottom edge.
                offsetX_from_qr_left_edge_px: ptToPx(10), // e.g., 10pt right from QR's left edge
                offsetY_from_qr_bottom_edge_px: ptToPx(10)  // e.g., 18pt below QR's bottom edge for date text baseline
            },
            qr: { 
                size: inchToPx(1),
                placement: 'bottom-left', 
                margin_bottom_inches: 0.75,
                margin_left_inches: 0.75 
            },
            certificateId: { 
                margin_bottom_inches: 0.4, 
                margin_left_inches: 0.5,
                fontSize: ptToPx(10),
                font: `${ptToPx(10)}px Arial, sans-serif`,
                color: '#000000',
                prefix: "Certificate ID: "
            }
        },
        'appreciation': { // Configuration for Appreciation Template - ADJUST AS NEEDED
            name: {
                // CRITICAL: YOU MUST ADJUST 'y' and 'x_center_line' for YOUR PDF.
                // 'y': Baseline of name, below "CERTIFICATE OF COMPLETION" title.
                // 'x_center_line': Horizontal center of "CERTIFICATE OF COMPLETION" title.
                y: 450, // EXAMPLE PLACEHOLDER - ADJUST!
                x_center_line: 590, // EXAMPLE PLACEHOLDER - ADJUST!
                textAlign: 'center', // Name will be centered
                fontSize: ptToPx(40),
                font: `bold ${ptToPx(40)}px "Times New Roman", serif`, // Large, bold, elegant
                color: '#000000',
                maxWidth: 700 // Adjust if names get too wide for the space under title
            },
            date: { 

                fontSize: ptToPx(10), // Font size for date
                font: `${ptToPx(10)}px Helvetica, sans-serif`,
                color: '#333333',
                // Offsets for dynamic placement relative to QR code (bottom-left QR assumed)
                // Date will be slightly right of QR's left edge, and below QR's bottom edge.
                offsetX_from_qr_left_edge_px: ptToPx(30), // e.g., 10pt right from QR's left edge
                offsetY_from_qr_bottom_edge_px: ptToPx(10)  // e.g., 18pt below QR's bottom edge for date text baseline
            },
            qr: { 
                size: inchToPx(1),
                placement: 'bottom-left', 
                margin_bottom_inches: 0.80,
                margin_left_inches: 0.75 
            },
            certificateId: { 
                margin_bottom_inches: 0.45, 
                margin_left_inches: 0.6,
                fontSize: ptToPx(10),
                font: `${ptToPx(10)}px Arial, sans-serif`,
                color: '#000000',
                prefix: "Certificate ID: "
            }}
    };

    // --- Event Listeners --- //
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            currentInputType = e.target.dataset.inputType;
            updateInputVisibility();
        });
    });

    if (generateButton) {
        generateButton.addEventListener('click', handleGeneration);
    }

    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', () => {
            if (currentlyPreviewedCertificate) {
                downloadCertificate(currentlyPreviewedCertificate, 'pdf');
            }
        });
    }
    if (downloadImageButton) {
        downloadImageButton.addEventListener('click', () => {
            if (currentlyPreviewedCertificate) {
                downloadCertificate(currentlyPreviewedCertificate, 'png');
            }
        });
    }

    // --- UI Update Functions --- //
    function updateInputVisibility() {
        if(document.getElementById('singleNameInput')) document.getElementById('singleNameInput').style.display = currentInputType === 'single' ? 'block' : 'none';
        if(document.getElementById('multipleNamesInput')) document.getElementById('multipleNamesInput').style.display = currentInputType === 'multiple' ? 'block' : 'none';
        if(document.getElementById('csvInput')) document.getElementById('csvInput').style.display = currentInputType === 'csv' ? 'block' : 'none';
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.inputType === currentInputType);
        });
    }
    updateInputVisibility(); // Initial call

    // --- Core Logic Functions --- //
    async function handleGeneration() {
        if (!window.pdfjsLib || !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            alert("PDF library is not properly configured. Cannot generate certificates.");
            return;
        }
        processingMessage.style.display = 'block';
        generateButton.disabled = true;
        certificateListDiv.innerHTML = '';
        generatedListSection.style.display = 'none';
        downloadButtonsDiv.style.display = 'none';
        generatedCertificatesData = [];

        const templateKey = templateSelect.value;
        const templatePath = templateSelect.options[templateSelect.selectedIndex].dataset.path;
        let names = [];

        if (currentInputType === 'single') {
            if (singleNameInput.value.trim()) names.push(singleNameInput.value.trim());
        } else if (currentInputType === 'multiple') {
            names = multipleNamesInput.value.split('\n').map(name => name.trim()).filter(name => name);
        } else if (currentInputType === 'csv') {
            const file = csvFileInput.files[0];
            if (file) {
                try {
                    const csvText = await file.text();
                    names = parseCSV(csvText);
                } catch (error) {
                    console.error("Error reading CSV file:", error);
                    alert("Error reading CSV file.");
                    processingMessage.style.display = 'none';
                    generateButton.disabled = false;
                    return;
                }
            }
        }

        if (names.length === 0) {
            alert("Please input at least one name or provide a valid CSV.");
            processingMessage.style.display = 'none';
            generateButton.disabled = false;
            return;
        }

        for (const name of names) {
            const certId = generateUniqueId();
            generatedCertificatesData.push({ name, certId, templateKey, templatePath });
        }
        
        populateCertificateListUI();

        if (generatedCertificatesData.length > 0) {
            await previewCertificate(generatedCertificatesData[0]);
            generatedListSection.style.display = 'block';
        } else {
            if(ctx && previewCanvas) ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }

        processingMessage.style.display = 'none';
        generateButton.disabled = false;
    }
    
    function populateCertificateListUI() {
        certificateListDiv.innerHTML = '';
        if (generatedCertificatesData.length === 0) {
            generatedListSection.style.display = 'none';
            return;
        }

        generatedCertificatesData.forEach((certData, index) => {
            const item = document.createElement('div');
            item.classList.add('certificate-item');
            item.innerHTML = `
                <span>${index + 1}. ${certData.name} (ID: ${certData.certId.substring(0,12)}...)</span>
                <div class="actions">
                    <button data-index="${index}" class="preview-btn">Preview</button>
                    <button data-index="${index}" class="download-pdf-btn">PDF</button>
                    <button data-index="${index}" class="download-png-btn">PNG</button>
                </div>
            `;
            certificateListDiv.appendChild(item);
        });

        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => previewCertificate(generatedCertificatesData[e.target.dataset.index]));
        });
        document.querySelectorAll('.download-pdf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => downloadCertificate(generatedCertificatesData[e.target.dataset.index], 'pdf'));
        });
        document.querySelectorAll('.download-png-btn').forEach(btn => {
            btn.addEventListener('click', (e) => downloadCertificate(generatedCertificatesData[e.target.dataset.index], 'png'));
        });
        generatedListSection.style.display = 'block';
    }

    async function previewCertificate(certData) {
        currentlyPreviewedCertificate = certData;
        currentPreviewNameEl.textContent = certData.name;
        currentPreviewIdEl.textContent = certData.certId;
        processingMessage.style.display = 'block';
        await drawCertificateOnCanvas(certData.name, certData.certId, certData.templateKey, certData.templatePath, previewCanvas);
        processingMessage.style.display = 'none';
        downloadButtonsDiv.style.display = 'block';
    }

    async function drawCertificateOnCanvas(name, certId, templateKey, templatePath, targetCanvas) {
        const config = templateConfigs[templateKey];
        if (!config) {
            console.error("Template configuration not found for:", templateKey);
            alert("Error: Template configuration missing.");
            return null;
        }
    
        try {
            const pdfDoc = await pdfjsLib.getDocument(templatePath).promise;
            const page = await pdfDoc.getPage(1); // Assuming single-page certificate
    
            const desiredWidth = 1240; // A good resolution, roughly A4 @ 150 DPI width
            const viewportDefault = page.getViewport({ scale: 1 });
            const scale = desiredWidth / viewportDefault.width;
            const viewport = page.getViewport({ scale: scale });
    
            targetCanvas.width = viewport.width;
            targetCanvas.height = viewport.height;
            const canvasContext = targetCanvas.getContext('2d');
    
            const renderContext = {
                canvasContext: canvasContext,
                viewport: viewport
            };
            await page.render(renderContext).promise;
    
            // --- Calculate QR Position first (needed for dynamic date placement) ---
            let qrActualX, qrActualY, qrActualSize;
            if (config.qr) {
                qrActualSize = config.qr.size; 
                const qrMarginBottomPx = inchToPx(config.qr.margin_bottom_inches || 0);
                if (config.qr.placement === 'bottom-left') {
                    const qrMarginLeftPx = inchToPx(config.qr.margin_left_inches || 0);
                    qrActualX = qrMarginLeftPx;
                } else { // Default to bottom-right
                    const qrMarginRightPx = inchToPx(config.qr.margin_right_inches || 0);
                    qrActualX = targetCanvas.width - qrActualSize - qrMarginRightPx;
                }
                qrActualY = targetCanvas.height - qrActualSize - qrMarginBottomPx; // This is QR's top Y
            }

            // --- Add Recipient's Name ---
            if (config.name) {
                canvasContext.font = config.name.font || `bold ${ptToPx(30)}px sans-serif`; // Use ptToPx for default
                canvasContext.fillStyle = config.name.color || '#000000';
                canvasContext.textAlign = config.name.textAlign || 'center';
                
                let currentFontString = config.name.font;
                let nameFontSizePx = config.name.fontSize; // Already in Px from ptToPx
    
                if (config.name.maxWidth) {
                    let textWidth = canvasContext.measureText(name).width;
                    // Ensure originalFontSizePart is derived correctly if currentFontString is complex
                    let originalFontSizePart = nameFontSizePx; 
                    const fontPxMatch = (currentFontString || "").match(/(\d+(\.\d+)?)px/);
                    if (fontPxMatch && fontPxMatch[1]) {
                        originalFontSizePart = parseFloat(fontPxMatch[1]);
                    }
                    let currentAdjustedSize = originalFontSizePart;

                    while (textWidth > config.name.maxWidth && currentAdjustedSize > 10) {
                        currentAdjustedSize--;
                        currentFontString = (currentFontString || "").replace(/(\d+(\.\d+)?)px/, `${currentAdjustedSize}px`);
                        canvasContext.font = currentFontString;
                        textWidth = canvasContext.measureText(name).width;
                    }
                }
                const drawX = (canvasContext.textAlign === 'center') 
                              ? (config.name.x_center_line || targetCanvas.width / 2) 
                              : (config.name.x || 0);
                canvasContext.fillText(name, drawX, config.name.y);
            }
    
            // --- Add Date (Dynamically placed if QR exists for this template and offsets are defined) ---
            if (config.date) {
                const dateConfig = config.date;
                let dateDrawX, dateDrawY;

                // Check if dynamic placement relative to QR is intended for this template
                if (config.qr && dateConfig.offsetX_from_qr_left_edge_px !== undefined && dateConfig.offsetY_from_qr_bottom_edge_px !== undefined && qrActualX !== undefined && qrActualY !== undefined && qrActualSize !== undefined) {
                    dateDrawX = qrActualX + dateConfig.offsetX_from_qr_left_edge_px;
                    dateDrawY = qrActualY + qrActualSize + dateConfig.offsetY_from_qr_bottom_edge_px; // Baseline of date text below QR
                } else if (dateConfig.x !== undefined && dateConfig.y !== undefined) {
                    // Fallback to static placement if dynamic offsets are not defined or QR info is missing
                    dateDrawX = dateConfig.x;
                    dateDrawY = dateConfig.y;
                } else {
                    // Absolute fallback if no coordinates are provided at all (should not happen with good config)
                    console.warn("Date coordinates not fully specified for template:", templateKey);
                    dateDrawX = targetCanvas.width - inchToPx(2); 
                    dateDrawY = targetCanvas.height - inchToPx(0.5); 
                }
                
                const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                canvasContext.font = dateConfig.font || `${dateConfig.fontSize || ptToPx(10)}px sans-serif`;
                canvasContext.fillStyle = dateConfig.color || '#000000';
                canvasContext.textAlign = 'left'; 
                canvasContext.fillText(`Date: ${currentDate}`, dateDrawX, dateDrawY);
            }
    
            // --- Add QR Code (Actual Drawing) ---
            if (config.qr && qrActualX !== undefined && qrActualY !== undefined && qrActualSize !== undefined) {
                const qrVerificationUrl = `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))}/qr-verification.html?id=${certId}`;
                const qr = new QRious({ value: qrVerificationUrl, size: qrActualSize, level: 'H' });
                const qrImg = new Image();
                await new Promise((resolve, reject) => {
                    qrImg.onload = () => { canvasContext.drawImage(qrImg, qrActualX, qrActualY, qrActualSize, qrActualSize); resolve(); };
                    qrImg.onerror = (err) => { console.error("QR image loading error:", err); reject(err); };
                    qrImg.src = qr.toDataURL();
                });
            }
    
            // --- Add Certificate ID ---
            if (config.certificateId) {
                const idMarginLeftPx = inchToPx(config.certificateId.margin_left_inches || 0);
                const idMarginBottomPx = inchToPx(config.certificateId.margin_bottom_inches || 0);
                const idX = idMarginLeftPx;
                const idY = targetCanvas.height - idMarginBottomPx; // Baseline from bottom
                canvasContext.font = config.certificateId.font || `${config.certificateId.fontSize || ptToPx(10)}px sans-serif`;
                canvasContext.fillStyle = config.certificateId.color || '#000000';
                canvasContext.textAlign = 'left'; 
                canvasContext.textBaseline = 'bottom'; // Align bottom of text to idY
                canvasContext.fillText((config.certificateId.prefix || "Certificate ID: ") + certId, idX, idY);
                canvasContext.textBaseline = 'alphabetic'; // Reset baseline
            }
            return targetCanvas;
        } catch (error) {
            console.error("Error drawing certificate:", error);
            const nameForError = name || "user"; // Handle case where name might be undefined
            alert(`Error generating certificate for ${nameForError}: ${error.message}. Check console for details.`);
            return null;
        }
    }
        
    async function downloadCertificate(certData, format) {
        processingMessage.style.display = 'block';
        const tempCanvas = document.createElement('canvas');
        // Ensure drawCertificateOnCanvas is called with all necessary parameters
        const drawnCanvas = await drawCertificateOnCanvas(certData.name, certData.certId, certData.templateKey, certData.templatePath, tempCanvas);
        
        if (!drawnCanvas) {
             processingMessage.style.display = 'none';
             alert("Failed to generate certificate image for download. Please check console for errors.");
             return;
        }

        const filename = `Certificate_${certData.templateKey}_${certData.name.replace(/\s+/g, '_')}_${certData.certId.substring(0,8)}.`;

        if (format === 'pdf') {
            const { jsPDF } = window.jspdf; // Ensure jsPDF is correctly accessed
            if (!jsPDF) {
                alert("jsPDF library not loaded. Cannot download PDF.");
                processingMessage.style.display = 'none';
                return;
            }
            const pdf = new jsPDF({
                orientation: drawnCanvas.width > drawnCanvas.height ? 'landscape' : 'portrait', // Use 'portrait' or 'landscape'
                unit: 'px',
                format: [drawnCanvas.width, drawnCanvas.height]
            });
            pdf.addImage(drawnCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, drawnCanvas.width, drawnCanvas.height);
            pdf.save(filename + 'pdf');
        } else { // PNG
            const imageURL = drawnCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imageURL;
            link.download = filename + 'png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        processingMessage.style.display = 'none';
    }

    // --- Utility Functions --- //
    function generateUniqueId() {
        return 'CERT-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    }

    function parseCSV(csvText) {
        const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length === 0) return [];

        const header = lines[0].toLowerCase().replace(/^"|"$/g, '');
        if (header === 'name') {
            return lines.slice(1).map(name => name.replace(/^"|"$/g, ''));
        }
        return lines.map(name => name.replace(/^"|"$/g, ''));
    }
});