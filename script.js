   // Configuração do PDF.js
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        // Elementos da interface
        const uploadSection = document.getElementById('uploadSection');
        const uploadBtn = document.getElementById('uploadBtn');
        const pdfInput = document.getElementById('pdfInput');
        const processBtn = document.getElementById('processBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const originalCanvas = document.getElementById('originalCanvas');
        const detectionCanvas = document.getElementById('detectionCanvas');
        const statusDiv = document.getElementById('status');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const loadingDetails = document.getElementById('loadingDetails');
        const loadingProgress = document.getElementById('loadingProgress');
        const resultsInfo = document.getElementById('resultsInfo');
        const labelsCount = document.getElementById('labelsCount');
        const pagesCount = document.getElementById('pagesCount');
        
        // Configurações
        const detectionModeInput = document.getElementById('detectionMode');
        const rowsInput = document.getElementById('rows');
        const colsInput = document.getElementById('cols');
        const marginInput = document.getElementById('margin');
        const pageSizeInput = document.getElementById('pageSize');
        const outputQualityInput = document.getElementById('outputQuality');
        const scalingModeInput = document.getElementById('scalingMode');
        const manualConfig = document.getElementById('manualConfig');
        const manualConfig2 = document.getElementById('manualConfig2');
        
        // Variáveis globais
        let pdfDoc = null;
        let processedPdfDoc = null;
        let detectedLabels = [];
        
        // Inicialização quando o DOM estiver carregado
        document.addEventListener('DOMContentLoaded', function() {
            // Configurar event listeners
            uploadBtn.addEventListener('click', () => pdfInput.click());
            pdfInput.addEventListener('change', handleFileSelect);
            uploadSection.addEventListener('dragover', handleDragOver);
            uploadSection.addEventListener('dragleave', handleDragLeave);
            uploadSection.addEventListener('drop', handleDrop);
            processBtn.addEventListener('click', processPdf);
            downloadBtn.addEventListener('click', downloadPdf);
            
            if (detectionModeInput) {
                detectionModeInput.addEventListener('change', toggleManualConfig);
            }
        });
        
        // Alternar configuração manual
        function toggleManualConfig() {
            if (detectionModeInput && detectionModeInput.value === 'manual') {
                if (manualConfig) manualConfig.style.display = 'block';
                if (manualConfig2) manualConfig2.style.display = 'block';
            } else {
                if (manualConfig) manualConfig.style.display = 'none';
                if (manualConfig2) manualConfig2.style.display = 'none';
            }
        }
        
        // Funções de upload de arquivo
        function handleDragOver(e) {
            e.preventDefault();
            uploadSection.classList.add('dragover');
        }
        
        function handleDragLeave(e) {
            e.preventDefault();
            uploadSection.classList.remove('dragover');
        }
        
        function handleDrop(e) {
            e.preventDefault();
            uploadSection.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type === 'application/pdf') {
                    loadPdf(file);
                } else {
                    showStatus('Por favor, selecione um arquivo PDF.', 'error');
                }
            }
        }
        
        function handleFileSelect(e) {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                loadPdf(file);
            }
        }
        
        // Mostrar tela de carregamento
        function showLoading(message, details) {
            if (loadingText) loadingText.textContent = message;
            if (loadingDetails) loadingDetails.textContent = details;
            if (loadingOverlay) loadingOverlay.style.display = 'flex';
        }
        
        // Atualizar progresso do carregamento
        function updateLoadingProgress(percent) {
            if (loadingProgress) loadingProgress.style.width = `${percent}%`;
        }
        
        // Esconder tela de carregamento
        function hideLoading() {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
        
        // Carregar e exibir PDF
        async function loadPdf(file) {
            try {
                showLoading('Carregando PDF...', 'Isso pode levar alguns segundos');
                updateLoadingProgress(10);
                
                const fileReader = new FileReader();
                
                fileReader.onload = async function() {
                    updateLoadingProgress(30);
                    
                    const typedarray = new Uint8Array(this.result);
                    
                    // Carregar PDF com pdf.js para visualização
                    pdfDoc = await pdfjsLib.getDocument(typedarray).promise;
                    
                    updateLoadingProgress(70);
                    
                    // Habilitar botão de processamento
                    if (processBtn) processBtn.disabled = false;
                    if (downloadBtn) downloadBtn.disabled = true;
                    
                    // Renderizar primeira página
                    await renderPage(pdfDoc, 1, originalCanvas);
                    
                    updateLoadingProgress(100);
                    setTimeout(() => {
                        hideLoading();
                        showStatus('PDF carregado com sucesso! Clique em "Separar Etiquetas" para processar.', 'success');
                    }, 500);
                };
                
                fileReader.readAsArrayBuffer(file);
            } catch (error) {
                console.error('Erro ao carregar PDF:', error);
                hideLoading();
                showStatus('Erro ao carregar o PDF. Verifique se o arquivo é válido.', 'error');
            }
        }
        
        // Renderizar página do PDF
        async function renderPage(pdfDocument, pageNum, container) {
            try {
                const page = await pdfDocument.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.0 });
                
                // Ajustar escala para caber no container
                const scale = Math.min(
                    container.clientWidth / viewport.width,
                    container.clientHeight / viewport.height
                ) * 0.9;
                
                const scaledViewport = page.getViewport({ scale });
                
                // Criar canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                
                // Limpar container
                container.innerHTML = '';
                container.appendChild(canvas);
                
                // Renderizar página
                const renderContext = {
                    canvasContext: context,
                    viewport: scaledViewport
                };
                
                await page.render(renderContext).promise;
                return { canvas, context, viewport: scaledViewport };
            } catch (error) {
                console.error('Erro ao renderizar página:', error);
                container.innerHTML = '<p>Erro ao renderizar a página</p>';
                return null;
            }
        }
        
        // Processar PDF para separar etiquetas
        async function processPdf() {
            if (!pdfDoc) {
                showStatus('Por favor, carregue um PDF primeiro.', 'error');
                return;
            }
            
            try {
                showLoading('Processando PDF...', 'Detectando e separando etiquetas');
                updateLoadingProgress(10);
                if (processBtn) processBtn.disabled = true;
                
                // Obter configurações com verificações de segurança
                const detectionMode = detectionModeInput ? detectionModeInput.value : 'auto';
                const margin = marginInput ? parseFloat(marginInput.value) : 5;
                const pageSize = pageSizeInput ? pageSizeInput.value : 'a4';
                const quality = outputQualityInput ? outputQualityInput.value : 'medium';
                const scalingMode = scalingModeInput ? scalingModeInput.value : 'fit';
                
                // Definir escala com base na qualidade
                let scale = 1.5; // padrão para qualidade média
                if (quality === 'high') scale = 3.0;
                if (quality === 'low') scale = 1.0;
                
                detectedLabels = [];
                
                // Processar cada página do PDF original
                for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                    // Atualizar progresso
                    const progress = 10 + (pageNum / pdfDoc.numPages) * 60;
                    updateLoadingProgress(progress);
                    if (loadingDetails) loadingDetails.textContent = `Processando página ${pageNum} de ${pdfDoc.numPages}`;
                    
                    // Renderizar página em alta resolução
                    const page = await pdfDoc.getPage(pageNum);
                    const viewport = page.getViewport({ scale });
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    // Detectar etiquetas na página
                    let labelsOnPage = [];
                    
                    if (detectionMode === 'auto') {
                        // Modo automático - assume 2 etiquetas lado a lado
                        labelsOnPage = detectLabelsAuto(canvas, viewport);
                    } else {
                        // Modo manual - usa configuração do usuário
                        const rows = rowsInput ? parseInt(rowsInput.value) : 1;
                        const cols = colsInput ? parseInt(colsInput.value) : 2;
                        labelsOnPage = detectLabelsManual(canvas, viewport, rows, cols);
                    }
                    
                    // Adicionar informações da página
                    labelsOnPage.forEach(label => {
                        label.page = pageNum;
                        detectedLabels.push(label);
                    });
                    
                    // Desenhar visualização das etiquetas detectadas
                    drawDetectedLabels(canvas, labelsOnPage);
                }
                
                // Criar PDF com etiquetas separadas
                updateLoadingProgress(80);
                if (loadingDetails) loadingDetails.textContent = 'Criando PDF com etiquetas separadas';
                
                await createSeparatedPdf(detectedLabels, margin, pageSize, scale, scalingMode);
                
                // Atualizar interface
                if (labelsCount) labelsCount.textContent = `Etiquetas detectadas: ${detectedLabels.length}`;
                if (pagesCount) pagesCount.textContent = `Páginas criadas: ${detectedLabels.length}`;
                if (resultsInfo) resultsInfo.style.display = 'block';
                
                updateLoadingProgress(100);
                setTimeout(() => {
                    hideLoading();
                    if (downloadBtn) downloadBtn.disabled = false;
                    showStatus(`Processamento concluído! ${detectedLabels.length} etiquetas separadas com sucesso.`, 'success');
                }, 500);
                
            } catch (error) {
                console.error('Erro ao processar PDF:', error);
                hideLoading();
                showStatus('Erro ao processar o PDF. Verifique as configurações.', 'error');
                if (processBtn) processBtn.disabled = false;
            }
        }
        
        // Detectar etiquetas automaticamente (assume 2 por página lado a lado)
        function detectLabelsAuto(canvas, viewport) {
            const labels = [];
            const pageWidth = viewport.width;
            const pageHeight = viewport.height;
            
            // Dividir a página em 2 partes iguais (lado a lado)
            const labelWidth = pageWidth / 2;
            const labelHeight = pageHeight;
            
            // Primeira etiqueta (esquerda)
            labels.push({
                x: 0,
                y: 0,
                width: labelWidth,
                height: labelHeight
            });
            
            // Segunda etiqueta (direita)
            labels.push({
                x: labelWidth,
                y: 0,
                width: labelWidth,
                height: labelHeight
            });
            
            return labels;
        }
        
        // Detectar etiquetas manualmente (baseado na configuração do usuário)
        function detectLabelsManual(canvas, viewport, rows, cols) {
            const labels = [];
            const pageWidth = viewport.width;
            const pageHeight = viewport.height;
            
            // Calcular dimensões de cada etiqueta
            const labelWidth = pageWidth / cols;
            const labelHeight = pageHeight / rows;
            
            // Criar etiquetas para cada célula da grade
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    labels.push({
                        x: col * labelWidth,
                        y: row * labelHeight,
                        width: labelWidth,
                        height: labelHeight
                    });
                }
            }
            
            return labels;
        }
        
        // Desenhar retângulos ao redor das etiquetas detectadas
        function drawDetectedLabels(canvas, labels) {
            // Copiar o canvas original para o canvas de detecção
            const detectionCtx = detectionCanvas.querySelector('canvas')?.getContext('2d') || 
                                detectionCanvas.appendChild(document.createElement('canvas')).getContext('2d');
            
            detectionCtx.canvas.width = canvas.width;
            detectionCtx.canvas.height = canvas.height;
            detectionCtx.drawImage(canvas, 0, 0);
            
            // Desenhar retângulos ao redor das etiquetas detectadas
            labels.forEach((label, index) => {
                detectionCtx.strokeStyle = `hsl(${index * 45 % 360}, 100%, 50%)`;
                detectionCtx.lineWidth = 3;
                detectionCtx.strokeRect(label.x, label.y, label.width, label.height);
                
                // Adicionar número da etiqueta
                detectionCtx.fillStyle = `hsl(${index * 45 % 360}, 100%, 50%)`;
                detectionCtx.font = 'bold 16px Arial';
                detectionCtx.fillText(`${index + 1}`, label.x + 5, label.y + 20);
            });
        }
        
        // Criar PDF com etiquetas separadas
        async function createSeparatedPdf(labels, margin, pageSize, scale, scalingMode) {
            const { PDFDocument } = PDFLib;
            processedPdfDoc = await PDFDocument.create();
            
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                
                // Renderizar a página original em alta resolução
                const page = await pdfDoc.getPage(label.page);
                const viewport = page.getViewport({ scale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                // Recortar a etiqueta
                const labelCanvas = document.createElement('canvas');
                labelCanvas.width = label.width;
                labelCanvas.height = label.height;
                const labelCtx = labelCanvas.getContext('2d');
                labelCtx.drawImage(canvas, label.x, label.y, label.width, label.height, 0, 0, label.width, label.height);
                
                // Converter para imagem
                const imageData = labelCanvas.toDataURL('image/png');
                const imageBytes = await fetch(imageData).then(res => res.arrayBuffer());
                const image = await processedPdfDoc.embedPng(imageBytes);
                
                // Determinar tamanho da página
                let pageWidth, pageHeight;
                if (pageSize === 'auto') {
                    // Usar o tamanho da etiqueta mais a margem
                    const marginPoints = margin * 2.83465; // Converter mm para pontos (1mm = 2.83465 pontos)
                    pageWidth = image.width + marginPoints * 2;
                    pageHeight = image.height + marginPoints * 2;
                } else if (pageSize === 'a4') {
                    pageWidth = 595.28; // A4 em pontos
                    pageHeight = 841.89;
                } else { // letter
                    pageWidth = 612; // Letter em pontos
                    pageHeight = 792;
                }
                
                // Adicionar página
                const newPage = processedPdfDoc.addPage([pageWidth, pageHeight]);
                
                // Calcular posição e dimensionamento
                const marginPoints = margin * 2.83465;
                let xPos, yPos, drawWidth, drawHeight;
                
                if (scalingMode === 'fit') {
                    // Ajustar a etiqueta para caber na página com margem
                    const availableWidth = pageWidth - (2 * marginPoints);
                    const availableHeight = pageHeight - (2 * marginPoints);
                    
                    // Calcular a escala para caber na área disponível
                    const scaleX = availableWidth / image.width;
                    const scaleY = availableHeight / image.height;
                    const scale = Math.min(scaleX, scaleY);
                    
                    drawWidth = image.width * scale;
                    drawHeight = image.height * scale;
                    
                    // Centralizar na página
                    xPos = (pageWidth - drawWidth) / 2;
                    yPos = (pageHeight - drawHeight) / 2;
                } else {
                    // Usar tamanho real (pode cortar se for maior que a página)
                    drawWidth = image.width;
                    drawHeight = image.height;
                    
                    // Centralizar na página
                    xPos = (pageWidth - drawWidth) / 2;
                    yPos = (pageHeight - drawHeight) / 2;
                }
                
                // Desenhar a etiqueta
                newPage.drawImage(image, {
                    x: xPos,
                    y: yPos,
                    width: drawWidth,
                    height: drawHeight,
                });
            }
        }
        
        // Baixar PDF processado
        async function downloadPdf() {
            if (!processedPdfDoc) {
                showStatus('Nenhum PDF processado para baixar.', 'error');
                return;
            }
            
            try {
                showLoading('Preparando download...', 'Gerando arquivo PDF');
                updateLoadingProgress(50);
                
                // Salvar PDF
                const pdfBytes = await processedPdfDoc.save();
                
                updateLoadingProgress(100);
                
                // Criar blob e link de download
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'etiquetas_separadas.pdf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                setTimeout(() => {
                    hideLoading();
                    showStatus('PDF baixado com sucesso!', 'success');
                }, 500);
            } catch (error) {
                console.error('Erro ao baixar PDF:', error);
                hideLoading();
                showStatus('Erro ao baixar o PDF.', 'error');
            }
        }
        
        // Mostrar mensagem de status
        function showStatus(message, type) {
            if (statusDiv) {
                statusDiv.textContent = message;
                statusDiv.className = 'status ' + type;
            }
        }