async function executeExportXLSX() {
                if (selectedExportCards.size === 0) {
                    alert("Please tap to select at least one tool to export.");
                    return;
                }

                if (typeof ExcelJS === 'undefined') {
                    alert("Excel library is still loading. Please try again in a moment.");
                    return;
                }

                const p = parentGroups.find(g => g.id === activeParentId);
                let fileExportName = p.name ? p.name : (appFolders.find(f => f.id === p.folderId)?.name || "Unnamed File");
                const safeExportDate = new Date().toLocaleString().replace(/,/g, ' at');

                const workbook = new ExcelJS.Workbook();
                workbook.creator = 'QC Toolset Pro';
                workbook.created = new Date();

                // ---- Shared style helpers ----
                const PRIMARY   = 'FF2563EB'; // app blue
                const SUCCESS   = 'FF059669'; // green
                const WARNING   = 'FFEF4444'; // red / error
                const ACCENT    = 'FFD97706'; // amber
                const LIGHT_BG  = 'FFE0EAFF'; // light blue tint
                const SECTION_BG= 'FF1E3A5F'; // dark navy for section headers
                const WHITE     = 'FFFFFFFF';
                const DARK_TEXT = 'FF1F2937';

                function hdr(text, color) {
                    return {
                        value: text,
                        style: {
                            font: { bold: true, color: { argb: WHITE }, size: 11 },
                            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: color || PRIMARY } },
                            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
                            border: {
                                top:    { style: 'thin', color: { argb: 'FFB0C4DE' } },
                                bottom: { style: 'thin', color: { argb: 'FFB0C4DE' } },
                                left:   { style: 'thin', color: { argb: 'FFB0C4DE' } },
                                right:  { style: 'thin', color: { argb: 'FFB0C4DE' } }
                            }
                        }
                    };
                }

                function cell(text, bold, bgColor) {
                    return {
                        value: text,
                        style: {
                            font: { bold: !!bold, color: { argb: DARK_TEXT }, size: 10 },
                            fill: bgColor ? { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } } : undefined,
                            alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
                            border: {
                                top:    { style: 'hair', color: { argb: 'FFD1D5DB' } },
                                bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } },
                                left:   { style: 'hair', color: { argb: 'FFD1D5DB' } },
                                right:  { style: 'hair', color: { argb: 'FFD1D5DB' } }
                            }
                        }
                    };
                }

                function sectionRow(sheet, title, color) {
                    const row = sheet.addRow([title]);
                    row.height = 22;
                    const c = row.getCell(1);
                    c.font = { bold: true, color: { argb: WHITE }, size: 11 };
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color || SECTION_BG } };
                    c.alignment = { horizontal: 'left', vertical: 'middle' };
                    sheet.mergeCells(row.number, 1, row.number, 20);
                }

                function applyRowData(sheet, rowData) {
                    const row = sheet.addRow(rowData.map(d => (d && typeof d === 'object' ? d.value : d)));
                    row.height = 18;
                    rowData.forEach((d, i) => {
                        if (d && typeof d === 'object' && d.style) {
                            const c = row.getCell(i + 1);
                            if (d.style.font)      c.font      = d.style.font;
                            if (d.style.fill)      c.fill      = d.style.fill;
                            if (d.style.alignment) c.alignment = d.style.alignment;
                            if (d.style.border)    c.border    = d.style.border;
                        }
                    });
                    return row;
                }

                // ---- SUMMARY SHEET ----
                const sheet = workbook.addWorksheet('Summary', { views: [{ showGridLines: false }] });
                sheet.properties.defaultRowHeight = 18;

                // Title block
                const titleRow = sheet.addRow(['QC Toolset Pro — Export Report']);
                titleRow.height = 30;
                titleRow.getCell(1).font = { bold: true, color: { argb: WHITE }, size: 14 };
                titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY } };
                titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
                sheet.mergeCells(1, 1, 1, 10);

                sheet.addRow([]);

                // Metadata block
                const metaRows = [
                    ['File Name',    fileExportName],
                    ['Product Code', p.productCode || ''],
                    ['Date',         p.date || ''],
                    ['Start Time',   formatTimeStringTo12Hour(p.startTime) || ''],
                    ['End Time',     formatTimeStringTo12Hour(p.endTime) || ''],
                    ['Exported On',  safeExportDate],
                ];
                metaRows.forEach(([label, value]) => {
                    const r = sheet.addRow([label, value]);
                    r.height = 18;
                    const labelCell = r.getCell(1);
                    const valueCell = r.getCell(2);
                    labelCell.font = { bold: true, color: { argb: WHITE }, size: 10 };
                    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY } };
                    labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
                    valueCell.font = { color: { argb: DARK_TEXT }, size: 10 };
                    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BG } };
                    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
                });

                sheet.addRow([]);

                // ---- PICKUP CALCULATOR ----
                if (selectedExportCards.has('card-pickup')) {
                    sectionRow(sheet, '📦  PICKUP CALCULATOR');
                    sheet.addRow([]);

                    p.pickupSets.forEach(set => {
                        let sumPct = 0, validCount = 0;
                        set.tabs.forEach(tab => {
                            let pre = parseFloat(tab.pre), post = parseFloat(tab.post);
                            if (!isNaN(pre) && !isNaN(post) && pre !== 0) {
                                sumPct += safeRound(((pre - post) / pre) * 100, 2);
                                validCount++;
                            }
                        });
                        const setAvgStr = validCount === 0 ? 'N/A' : safeRound(sumPct / validCount, 2).toFixed(2) + '%';

                        // Set info rows
                        let setInfoRow = sheet.addRow([hdr('Set', ACCENT), cell(set.name, true), hdr('Set Average', ACCENT), cell(setAvgStr, true)]);
                        setInfoRow.height = 20;
                        setInfoRow.eachCell({ includeEmpty: false }, (c, col) => { /* styles already applied */ });
                        applyRowData(sheet, [hdr('Set', ACCENT), cell(set.name, true), hdr('Set Average', ACCENT), cell(setAvgStr, true)]);
                        // Remove the auto-added plain row above by using applyRowData directly:
                        sheet.spliceRows(sheet.lastRow.number - 1, 1);

                        if (set.unit) applyRowData(sheet, [hdr('Unit', ACCENT), cell(set.unit)]);

                        // Column headers
                        const colHeaders = [hdr(''), ...set.tabs.map(t => hdr(t.name))];
                        applyRowData(sheet, colHeaders);

                        const preRow   = [hdr('Pre-Sample')];
                        const postRow  = [hdr('Post-Sample')];
                        const decRow   = [hdr('Decimal')];
                        const pctRow   = [hdr('Percentage')];

                        set.tabs.forEach(tab => {
                            const pre = parseFloat(tab.pre), post = parseFloat(tab.post);
                            let dec = '', pct = '';
                            if (!isNaN(pre) && !isNaN(post) && pre !== 0) {
                                let decVal = (pre - post) / pre;
                                if (decVal < 0) decVal = 0;
                                dec = safeRound(decVal, 4).toFixed(4);
                                pct = safeRound(decVal * 100, 2).toFixed(2) + '%';
                            }
                            preRow.push(cell(tab.pre || ''));
                            postRow.push(cell(tab.post || ''));
                            decRow.push(cell(dec));
                            pctRow.push(cell(pct, false, pct ? LIGHT_BG : undefined));
                        });

                        applyRowData(sheet, preRow);
                        applyRowData(sheet, postRow);
                        applyRowData(sheet, decRow);
                        applyRowData(sheet, pctRow);
                        sheet.addRow([]);
                    });
                }

                // ---- SUM & AVERAGING ----
                if (selectedExportCards.has('card-averaging')) {
                    sectionRow(sheet, '📊  SUM & AVERAGING');
                    sheet.addRow([]);

                    p.sumSets.forEach(set => {
                        let sNames = [], rLimits = [], counts = [], sums = [], avgs = [];
                        let underR = [], overR = [], withinR = [], outOfRangePctVals = [];
                        let maxDataLength = 0, allData = [];

                        set.tabs.forEach(tab => {
                            let min = parseFloat(tab.minRange), max = parseFloat(tab.maxRange);
                            let hasRange = !isNaN(min) && !isNaN(max);
                            if (hasRange && min > max) { let tmp = min; min = max; max = tmp; }
                            let sum = tab.data.reduce((a,b) => a + Number(b), 0);
                            let precision = getDynamicPrecision(tab.data);
                            let displaySum = tab.data.length ? safeRound(sum, precision).toFixed(precision) : 0;
                            let avg = tab.data.length ? safeRound(sum/tab.data.length, precision).toFixed(precision) : 0;
                            let count = tab.data.length;
                            let under = 0, over = 0, within = 0;
                            if (hasRange) tab.data.forEach(n => { if (Number(n) < min) under++; else if (Number(n) > max) over++; else within++; });
                            let outPct = 'N/A';
                            if (hasRange && count > 0) outPct = safeRound(((under+over)/count)*100,2).toFixed(2)+'%';
                            else if (hasRange) outPct = '0.00%';

                            sNames.push(tab.name);
                            rLimits.push(hasRange ? `${min} - ${max}` : 'N/A');
                            counts.push(String(count));
                            sums.push(String(displaySum));
                            avgs.push(String(avg));
                            underR.push(hasRange ? String(under) : 'N/A');
                            overR.push(hasRange ? String(over) : 'N/A');
                            withinR.push(hasRange ? String(within) : 'N/A');
                            outOfRangePctVals.push(outPct);
                            if (tab.data.length > maxDataLength) maxDataLength = tab.data.length;
                            allData.push(tab.data);
                        });

                        applyRowData(sheet, [hdr('Set', ACCENT), cell(set.name, true)]);
                        if (set.unit) applyRowData(sheet, [hdr('Unit', ACCENT), cell(set.unit)]);

                        // Stats header row
                        applyRowData(sheet, [hdr(''), ...sNames.map(n => hdr(n))]);
                        const statRows = [
                            ['Range Limit',     rLimits],
                            ['Count',           counts],
                            ['Sum',             sums],
                            ['Average',         avgs],
                            ['Below Range',     underR],
                            ['Above Range',     overR],
                            ['Within Range',    withinR],
                            ['Out of Range %',  outOfRangePctVals],
                        ];
                        statRows.forEach(([label, vals]) => {
                            const isOOR = label === 'Out of Range %';
                            applyRowData(sheet, [hdr(label), ...vals.map(v => {
                                const isHigh = isOOR && v !== 'N/A' && parseFloat(v) > 0;
                                return cell(v, false, isHigh ? 'FFFEE2E2' : undefined);
                            })]);
                        });

                        // Data points
                        if (maxDataLength > 0) {
                            applyRowData(sheet, [hdr('Data Points', 'FF374151'), ...sNames.map(n => hdr(n, 'FF374151'))]);
                            for (let i = 0; i < maxDataLength; i++) {
                                const rowData = [cell('')];
                                for (let t = 0; t < allData.length; t++) {
                                    rowData.push(cell(i < allData[t].length ? String(allData[t][i]) : ''));
                                }
                                applyRowData(sheet, rowData);
                            }
                        }
                        sheet.addRow([]);
                    });
                }

                // ---- PRODUCTION PACE ----
                if (selectedExportCards.has('card-estimator')) {
                    sectionRow(sheet, '⏱️  PRODUCTION PACE');
                    sheet.addRow([]);

                    p.estimatorTabs.forEach(tab => {
                        let sortedData = [...tab.data].sort((a,b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
                        applyRowData(sheet, [hdr('Line', ACCENT), cell(tab.name, true)]);
                        applyRowData(sheet, [hdr('Unit', ACCENT), cell(tab.unit || 'Units')]);
                        applyRowData(sheet, [hdr('Shift Start', ACCENT), cell(formatTimeStringTo12Hour(tab.startTime) || '')]);

                        if (sortedData.length === 0) {
                            applyRowData(sheet, [hdr('Status'), cell('No logs recorded.')]);
                        } else {
                            applyRowData(sheet, [hdr(''), hdr('Amount'), hdr('Clock Time'), hdr('Status')]);
                            sortedData.forEach(e => {
                                const statusBg = e.checked ? 'FFD1FAE5' : 'FFFEF3C7';
                                applyRowData(sheet, [
                                    cell(''),
                                    cell(String(e.amount)),
                                    cell(formatTimeStringTo12Hour(e.time)),
                                    cell(e.checked ? 'Logged' : 'Ignored', false, statusBg)
                                ]);
                            });
                        }
                        sheet.addRow([]);
                    });
                }

                // ---- SALINITY CALCULATOR ----
                if (selectedExportCards.has('card-salinity')) {
                    sectionRow(sheet, '🧪  SALINITY CALCULATOR');
                    sheet.addRow([]);

                    const salHdr = [hdr(''), ...(p.salinityTabs || []).map(t => hdr(t.name))];
                    const brixRow = [hdr('Brix')];
                    const pctRow  = [hdr('Salinity %')];

                    (p.salinityTabs || []).forEach(tab => {
                        brixRow.push(cell(tab.brix || ''));
                        let pct = '';
                        let brix = parseFloat(tab.brix);
                        if (!isNaN(brix)) pct = safeRound((brix / 26.4) * 100, 2).toFixed(2) + '%';
                        pctRow.push(cell(pct, false, pct ? LIGHT_BG : undefined));
                    });

                    applyRowData(sheet, salHdr);
                    applyRowData(sheet, brixRow);
                    applyRowData(sheet, pctRow);
                    sheet.addRow([]);
                }

                // ---- TALLY COUNTERS ----
                if (selectedExportCards.has('card-tally')) {
                    sectionRow(sheet, '🔢  TALLY COUNTERS');
                    sheet.addRow([]);
                    
                    (p.tallyTabs || []).forEach((tab) => {
                        applyRowData(sheet, [hdr(`Sample: ${tab.name}`)]);
                        applyRowData(sheet, [hdr('Counter Name'), hdr('Count')]);
                        (tab.tallies || []).forEach((t, i) => {
                            const bg = i % 2 === 0 ? LIGHT_BG : WHITE;
                            applyRowData(sheet, [cell(t.name, false, bg), cell(String(t.count), false, bg)]);
                        });
                        sheet.addRow([]);
                    });
                }

                // ---- TIMESTAMPS ----
                if (selectedExportCards.has('card-timestamps')) {
                    sectionRow(sheet, '🕐  TIME LOGS');
                    sheet.addRow([]);

                    if (!p.timestamps || p.timestamps.length === 0) {
                        applyRowData(sheet, [cell('No logs recorded.')]);
                    } else {
                        applyRowData(sheet, [hdr('Time'), hdr('Event')]);
                        let sortedTs = [...p.timestamps].sort((a,b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
                        sortedTs.forEach((ts, i) => {
                            const bg = i % 2 === 0 ? LIGHT_BG : WHITE;
                            applyRowData(sheet, [
                                cell(formatTimeStringTo12Hour(ts.time), false, bg),
                                cell(ts.event, false, bg)
                            ]);
                        });
                    }
                    sheet.addRow([]);
                }

                // ---- QUICK NOTES ----
                if (selectedExportCards.has('card-notes')) {
                    sectionRow(sheet, '📝  QUICK NOTES');
                    sheet.addRow([]);
                    const notesRow = sheet.addRow([p.notes?.text || '']);
                    notesRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
                    notesRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
                    notesRow.height = 60;
                    sheet.mergeCells(notesRow.number, 1, notesRow.number, 8);
                    sheet.addRow([]);
                }

                // ---- Column widths (auto-fit heuristic) ----
                sheet.columns.forEach((col, i) => {
                    let maxLen = 10;
                    col.eachCell({ includeEmpty: false }, c => {
                        const val = c.value ? String(c.value) : '';
                        if (val.length > maxLen) maxLen = val.length;
                    });
                    col.width = Math.min(maxLen + 4, 40);
                });

                // ---- GRAPHS EXPORT ----
                const graphConfigs = [];
                if (selectedExportCards.has('card-tally')) graphConfigs.push({ id: 'canvas-tally', name: 'Tally Counters' });
                if (selectedExportCards.has('card-salinity')) graphConfigs.push({ id: 'canvas-salinity', name: 'Salinity Calculator' });
                if (selectedExportCards.has('card-averaging')) graphConfigs.push({ id: 'canvas-averaging', name: 'Sum & Averaging' });
                if (selectedExportCards.has('card-pickup')) graphConfigs.push({ id: 'canvas-pickup', name: 'Pickup Calculator' });
                if (selectedExportCards.has('card-estimator')) graphConfigs.push({ id: 'canvas-pace', name: 'Production Pace' });

                if (graphConfigs.length > 0) {
                    sectionRow(sheet, '📊  DATA GRAPHS');
                    sheet.addRow([]);

                    if (typeof renderGraphs === 'function') renderGraphs();
                    
                    for (const conf of graphConfigs) {
                        const canvas = document.getElementById(conf.id);
                        if (canvas && canvas.style.display !== 'none' && chartInstances[conf.id]) {
                            // A white background behind transparent PNGs makes them visible in Excel
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = canvas.width;
                            tempCanvas.height = canvas.height;
                            const ctx = tempCanvas.getContext('2d');
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                            ctx.drawImage(canvas, 0, 0);
                            
                            const base64Image = tempCanvas.toDataURL('image/png');
                            const imageId = workbook.addImage({ base64: base64Image, extension: 'png' });

                            applyRowData(sheet, [hdr(conf.name)]);
                            const currentRow = sheet.rowCount;
                            
                            sheet.addImage(imageId, {
                                tl: { col: 0, row: currentRow },
                                ext: { width: Math.min(canvas.width, 600), height: Math.min(canvas.height, 300) }
                            });
                            
                            // 300px is roughly 15 rows (default row height ~20px)
                            for (let i = 0; i < 16; i++) {
                                sheet.addRow([]);
                            }
                        }
                    }
                }

                // ---- Generate & download ----
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                let baseName = p.productCode ? `${p.productCode} - ${fileExportName}` : fileExportName;
                let safeName = baseName.replace(/[^a-z0-9 \-]/gi, '_');
                link.setAttribute('href', url);
                link.setAttribute('download', `${safeName}.xlsx`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                cancelExportMode();
            }
			
			// Sidebar Edit Mode State
			let isSidebarEditMode = false;
			let selectedSidebarItems = new Set();
			
			