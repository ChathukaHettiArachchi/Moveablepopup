const container = document.querySelector('.popupscrollarea');
const tagContainer = document.querySelector('.chatWrapper');
const btn = document.getElementById('Addpopups');
let popupCount = 0;

// Constants
const POPUP_WIDTH = 155;
const POPUP_HEIGHT = 100;
const POPUP_GAP = 40;
const POPUPS_PER_ROW = 9;
const ROW_HEIGHT = POPUP_HEIGHT + POPUP_GAP;
const TAG_GAP = 5;

// Helper function to get color based on popup title
function getPopupColor(title) {
    const headerText = (title || '').toLowerCase();
    const colorMap = {
        "papaya": { background: "#8B0000", color: "#FFFFFF" },
        "apple": { background: "#00008B", color: "#FFFFFF" },
        "mango": { background: "#5C4033", color: "#FFFFFF" },
        "banana": { background: "rgb(51, 51, 49)", color: "#FFFFFF" },
        "orange": { background: "#FF8C00", color: "#FFFFFF" },
        "grape": { background: "#6F0B93", color: "#FFFFFF" },
        "strawberry": { background: "#E30B5C", color: "#FFFFFF" },
        "pineapple": { background: "#FFA500", color: "#FFFFFF" },
        "watermelon": { background: "#008000", color: "#FFFFFF" },
        "blueberry": { background: "#4169E1", color: "#FFFFFF" },
        "raspberry": { background: "#C72C48", color: "#FFFFFF" },
        "peach": { background: "#683e08ff", color: "#FFFFFF" },
        "pear": { background: "#7CB342", color: "#FFFFFF" },
        "cherry": { background: "#C41E3A", color: "#FFFFFF" },
        "lemon": { background: "#94da12ff", color: "#FFFFFF" },
        "lime": { background: "#32CD32", color: "#FFFFFF" },
        "kiwi": { background: "#8B7355", color: "#FFFFFF" },
        "pomegranate": { background: "#DC143C", color: "#FFFFFF" },
        "avocado": { background: "#556B2F", color: "#FFFFFF" },
        "cantaloupe": { background: "#FF9500", color: "#FFFFFF" },
        "rambutan": { background: "#8B0000", color: "#FFFFFF" },
        "apricot": { background: "#FFA500", color: "#FFFFFF" },
        "mangosteen": { background: "#8B008B", color: "#FFFFFF" },
        "durian": { background: "#D4AF37", color: "#FFFFFF" },
        "dragonfruit": { background: "#FF1493", color: "#FFFFFF" }
    };
    
    for (let [key, value] of Object.entries(colorMap)) {
        if (headerText.includes(key)) return value;
    }
    return { background: "#444", color: "#fff" };
}

// Helper: Find first available grid position
function findFirstEmptyGridSlot(excludePopup = null) {
    const visiblePopups = Array.from(container.querySelectorAll('.Chatpopup'))
        .filter(p => p !== excludePopup && p.style.display !== 'none');
    
    const occupiedPositions = new Set();
    visiblePopups.forEach(p => {
        const pLeft = parseFloat(p.style.left) || p.offsetLeft;
        const pTop = parseFloat(p.style.top) || p.offsetTop;
        const col = Math.round((pLeft - POPUP_GAP) / (POPUP_WIDTH + POPUP_GAP));
        const row = Math.round((pTop - POPUP_GAP - 30) / ROW_HEIGHT);
        occupiedPositions.add(`${row}-${col}`);
    });
    
    for (let row = 0; row < 100; row++) {
        for (let col = 0; col < POPUPS_PER_ROW; col++) {
            if (!occupiedPositions.has(`${row}-${col}`)) {
                return {
                    left: POPUP_GAP + (col * (POPUP_WIDTH + POPUP_GAP)),
                    top: POPUP_GAP + 30 + (row * ROW_HEIGHT)
                };
            }
        }
    }
    return { left: POPUP_GAP, top: POPUP_GAP + 30 };
}

// Helper: Create close button for tags
function createCloseButton() {
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position:absolute; top:2px; right:4px; cursor:pointer;
        font-size:16px; font-weight:bold; line-height:1;
        padding:0 2px; color:inherit; z-index:10;
        background:rgba(0,0,0,0.1); border-radius:2px;
    `;
    closeBtn.title = 'Close';
    return closeBtn;
}

// Helper: Check border space
function getBorderSpace(side, excludeTag = null) {
    const existingTags = Array.from(tagContainer.querySelectorAll('.border-tag'))
        .filter(t => t !== excludeTag && t.style.display !== 'none');
    
    const rect = tagContainer.getBoundingClientRect();
    let occupiedSpace = 0;
    
    if (side === 'left' || side === 'right') {
        existingTags.forEach(t => {
            const tSide = t.style.left === '0px' || parseFloat(t.style.left) <= 3 ? 'left' : 
                          t.style.right && parseFloat(t.style.right) <= 10 ? 'right' : null;
            if (tSide === side) occupiedSpace += t.offsetHeight + TAG_GAP;
        });
        return rect.height - occupiedSpace - 60;
    } else {
        existingTags.forEach(t => {
            const tSide = t.style.top === '0px' || t.style.top === '1px' ? 'top' : 
                          t.style.bottom && parseFloat(t.style.bottom) <= 10 ? 'bottom' : null;
            if (tSide === side) occupiedSpace += t.offsetWidth + TAG_GAP;
        });
        return rect.width - occupiedSpace - 60;
    }
}

// Helper: Find next available border based on popup position
function findNearestAvailableBorder(currentSide, requiredSpace, popup) {
    const containerRect = container.getBoundingClientRect();
    const pRect = popup.getBoundingClientRect();
    const popupCenterY = pRect.top + pRect.height / 2;
    const popupCenterX = pRect.left + pRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;
    const containerCenterX = containerRect.left + containerRect.width / 2;

    // Determine which borders to try based on current side and popup position
    let priorities = [];
    
    if (currentSide === 'left') {
        // LEFT border full → move ONLY to TOP or BOTTOM (whichever is closer to popup)
        if (popupCenterY < containerCenterY) {
            priorities = ['top', 'bottom'];
        } else {
            priorities = ['bottom', 'top'];
        }
    } else if (currentSide === 'right') {
        // RIGHT border full → move ONLY to TOP or BOTTOM (whichever is closer to popup)
        if (popupCenterY < containerCenterY) {
            priorities = ['top', 'bottom'];
        } else {
            priorities = ['bottom', 'top'];
        }
    } else if (currentSide === 'top') {
        // TOP border full → move ONLY to LEFT or RIGHT (whichever is closer to popup)
        if (popupCenterX < containerCenterX) {
            priorities = ['left', 'right'];
        } else {
            priorities = ['right', 'left'];
        }
    } else if (currentSide === 'bottom') {
        // BOTTOM border full → move ONLY to LEFT or RIGHT (whichever is closer to popup)
        if (popupCenterX < containerCenterX) {
            priorities = ['left', 'right'];
        } else {
            priorities = ['right', 'left'];
        }
    }

    // Check each priority side for available space
    for (let side of priorities) {
        if (getBorderSpace(side) >= requiredSpace) {
            return side;
        }
    }

    // Fallback to first available
    return priorities[0] || 'top';
}


// Helper: Position tag on specified border with BIDIRECTIONAL smart spacing
function positionTagOnBorder(tag, side, title, x, y, closeBtn, fromSide) {
    tag.style.right = tag.style.bottom = tag.style.left = tag.style.top = "";
    
    const rect = tagContainer.getBoundingClientRect();
    const existingTags = Array.from(tagContainer.querySelectorAll('.border-tag'))
        .filter(t => t !== tag && t.style.display !== 'none');
    
    // Get existing tags on this side
    const tagsOnSide = existingTags.filter(t => {
        const tLeft = parseFloat(t.style.left);
        const tRight = parseFloat(t.style.right);
        const tTop = parseFloat(t.style.top);
        const tBottom = parseFloat(t.style.bottom);
        
        if (side === 'left') return t.style.left === '0px' || tLeft <= 10;
        if (side === 'right') return t.style.right && tRight <= 10;
        if (side === 'top') return t.style.top === '1px' || t.style.top === '0px' || tTop <= 10;
        if (side === 'bottom') return t.style.bottom && tBottom <= 10;
        return false;
    });
    
    // UPDATED: Helper to get ALL gaps (both filled and empty spaces)
    function findAllGaps(direction, requiredSize) {
        const ranges = [];
        tagsOnSide.forEach(t => {
            const tRect = t.getBoundingClientRect();
            const tagContainerRect = tagContainer.getBoundingClientRect();
            
            if (direction === 'horizontal') {
                ranges.push({
                    start: tRect.left - tagContainerRect.left,
                    end: tRect.right - tagContainerRect.left
                });
            } else {
                ranges.push({
                    start: tRect.top - tagContainerRect.top,
                    end: tRect.bottom - tagContainerRect.top
                });
            }
        });
        
        const maxSize = direction === 'horizontal' ? rect.width - 100 : rect.height - 60;
        const startOffset = direction === 'horizontal' ? 50 : 30;
        
        // Sort ranges by start position
        ranges.sort((a, b) => a.start - b.start);
        
        const gaps = [];
        
        // Gap before first tag
        if (ranges.length === 0) {
            gaps.push({ start: startOffset, end: maxSize, size: maxSize - startOffset });
        } else if (ranges[0].start - startOffset >= requiredSize) {
            gaps.push({ start: startOffset, end: ranges[0].start - TAG_GAP, size: ranges[0].start - startOffset - TAG_GAP });
        }
        
        // Gaps between tags
        for (let i = 0; i < ranges.length - 1; i++) {
            const gapStart = ranges[i].end + TAG_GAP;
            const gapEnd = ranges[i + 1].start - TAG_GAP;
            const gapSize = gapEnd - gapStart;
            
            if (gapSize >= requiredSize) {
                gaps.push({ start: gapStart, end: gapEnd, size: gapSize });
            }
        }
        
        // Gap after last tag
        if (ranges.length > 0) {
            const lastEnd = ranges[ranges.length - 1].end;
            const remainingSpace = maxSize - lastEnd - TAG_GAP;
            if (remainingSpace >= requiredSize) {
                gaps.push({ start: lastEnd + TAG_GAP, end: maxSize, size: remainingSpace });
            }
        }
        
        return gaps;
    }
    
    // Helper to find closest gap to preferred position
    function findClosestGap(gaps, preferredPos, requiredSize, direction = 'forward') {
        if (gaps.length === 0) return null;
        
        // If direction is 'reverse', we want to place from the end
        if (direction === 'reverse') {
            // Check if preferred position fits in any gap (from the end)
            for (let gap of gaps) {
                const endPos = gap.end - requiredSize;
                if (preferredPos >= gap.start && preferredPos + requiredSize <= gap.end) {
                    return { start: preferredPos, gap: gap };
                }
            }
            
            // Otherwise find closest gap and place at the end of it
            let closestGap = gaps[gaps.length - 1];
            let minDistance = Math.abs(preferredPos - (gaps[gaps.length - 1].end - requiredSize));
            
            for (let gap of gaps) {
                const distToEnd = Math.abs(preferredPos - (gap.end - requiredSize));
                if (distToEnd < minDistance) {
                    minDistance = distToEnd;
                    closestGap = gap;
                }
            }
            
            return { start: closestGap.end - requiredSize, gap: closestGap };
        }
        
        // Forward direction (default)
        let closestGap = gaps[0];
        let minDistance = Math.abs(preferredPos - gaps[0].start);
        
        for (let gap of gaps) {
            // Check if preferred position is within this gap
            if (preferredPos >= gap.start && preferredPos + requiredSize <= gap.end) {
                return { start: preferredPos, gap: gap };
            }
            
            // Otherwise find closest gap
            const distToStart = Math.abs(preferredPos - gap.start);
            const distToEnd = Math.abs(preferredPos - (gap.end - requiredSize));
            const minDist = Math.min(distToStart, distToEnd);
            
            if (minDist < minDistance) {
                minDistance = minDist;
                closestGap = gap;
            }
        }
        
        return { start: closestGap.start, gap: closestGap };
    }
    
    // Helper to check if there's ANY available space on current border
    function hasAvailableSpace(direction, requiredSize) {
        const gaps = findAllGaps(direction, requiredSize);
        return gaps.length > 0;
    }
    
    // Determine placement direction based on fromSide
    let placementDirection = 'forward';
    if ((side === 'top' || side === 'bottom') && fromSide === 'right') {
        placementDirection = 'reverse';
    } else if ((side === 'left' || side === 'right') && fromSide === 'bottom') {
        placementDirection = 'reverse';
    }
    
    if (side === 'top') {
        tag.style.top = "0px";
        tag.innerHTML = title;
        tag.style.whiteSpace = "nowrap";
        
        const gaps = findAllGaps('horizontal', tag.offsetWidth);
        
        if (gaps.length > 0) {
            // Left border → Top: left to right (forward)
            // Right border → Top: right to left (reverse)
            const preferredLeft = placementDirection === 'reverse' ? rect.width - tag.offsetWidth - 60 : Math.max(x, 50);
            const closestGap = findClosestGap(gaps, preferredLeft, tag.offsetWidth, placementDirection);
            tag.style.left = closestGap.start + "px";
        } else {
            tag.style.left = "50px";
        }
        
    } else if (side === 'right') {
        tag.style.right = TAG_GAP + "px";
        tag.innerHTML = [...title].join('\n');
        tag.style.whiteSpace = "pre-line";
        
        const gaps = findAllGaps('vertical', tag.offsetHeight);
        
        if (gaps.length > 0) {
            // Top border → Right: top to bottom (forward)
            // Bottom border → Right: bottom to top (reverse)
            const preferredTop = placementDirection === 'reverse' ? rect.height - tag.offsetHeight - 60 : Math.max(y, 30);
            const closestGap = findClosestGap(gaps, preferredTop, tag.offsetHeight, placementDirection);
            tag.style.top = closestGap.start + "px";
        } else {
            tag.style.top = "30px";
        }
        
    } else if (side === 'bottom') {
        tag.style.bottom = TAG_GAP + "px";
        tag.innerHTML = title;
        tag.style.whiteSpace = "nowrap";
        
        const gaps = findAllGaps('horizontal', tag.offsetWidth);
        
        if (gaps.length > 0) {
            // Left border → Bottom: left to right (forward)
            // Right border → Bottom: right to left (reverse)
            const preferredLeft = placementDirection === 'reverse' ? rect.width - tag.offsetWidth - 60 : Math.max(x, 50);
            const closestGap = findClosestGap(gaps, preferredLeft, tag.offsetWidth, placementDirection);
            tag.style.left = closestGap.start + "px";
        } else {
            tag.style.left = "50px";
        }
        
    } else if (side === 'left') {
        tag.style.left = "0px";
        tag.innerHTML = [...title].join('\n');
        tag.style.whiteSpace = "pre-line";
        
        const gaps = findAllGaps('vertical', tag.offsetHeight);
        
        if (gaps.length > 0) {
            // Top border → Left: top to bottom (forward)
            // Bottom border → Left: bottom to top (reverse)
            const preferredTop = placementDirection === 'reverse' ? rect.height - tag.offsetHeight - 60 : Math.max(y, 30);
            const closestGap = findClosestGap(gaps, preferredTop, tag.offsetHeight, placementDirection);
            tag.style.top = closestGap.start + "px";
        } else {
            tag.style.top = "30px";
        }
    }
    
    tag.appendChild(closeBtn);
    
    // Return whether space was available
    const direction = (side === 'top' || side === 'bottom') ? 'horizontal' : 'vertical';
    const requiredSize = (side === 'top' || side === 'bottom') ? tag.offsetWidth : tag.offsetHeight;
    return hasAvailableSpace(direction, requiredSize);
}

// Load saved state on page load
window.addEventListener('load', () => {
    const savedState = loadState();
    
    if (savedState && savedState.popups.length > 0) {
        savedState.tags?.forEach(tagData => restoreTag(tagData));
        savedState.popups.forEach((popupData, index) => {
            restorePopup(popupData);
        });
        
        setTimeout(() => {
            const allPopups = Array.from(container.querySelectorAll('.Chatpopup'));
            const rect = container.getBoundingClientRect();
            
            allPopups.forEach(popup => {
                const titleEl = popup.querySelector('.popup-title');
                const title = titleEl ? titleEl.innerText : '';
                
                const hasVisibleTag = Array.from(tagContainer.querySelectorAll('.border-tag'))
                    .some(tag => {
                        const tagText = tag.getAttribute('data-original-text') || tag.innerText.replace(/\n/g, '').replace('×', '');
                        return tagText === title && tag.style.display !== 'none';
                    });
                
                if (popup.style.display === 'none' && !hasVisibleTag) {
                    popup.style.display = 'block';
                    popup.closedByTag = false;
                    const pos = findFirstEmptyGridSlot(popup);
                    popup.style.left = pos.left + "px";
                    popup.style.top = pos.top + "px";
                }
            });
            
            // Link secondary tags to popups
            const secondaryTags = Array.from(tagContainer.querySelectorAll('.secondary-tag'));
            secondaryTags.forEach(tag => {
                const titleText = tag.innerText.replace(/\n/g, '').replace('×', '').trim();
                const popup = Array.from(container.querySelectorAll('.Chatpopup')).find(p => {
                    const titleEl = p.querySelector('.popup-title');
                    return titleEl && titleEl.innerText === titleText;
                });
                if (popup && !popup.secondaryTag) {
                    popup.secondaryTag = tag;
                    if (tag.style.left && parseFloat(tag.style.left) <= 10) popup.secondaryTagSide = 'left';
                    else if (tag.style.right && parseFloat(tag.style.right) <= 10) popup.secondaryTagSide = 'right';
                    else if (tag.style.top && parseFloat(tag.style.top) <= 10) popup.secondaryTagSide = 'top';
                    else if (tag.style.bottom && parseFloat(tag.style.bottom) <= 10) popup.secondaryTagSide = 'bottom';
                }
            });
            
            autoSortTags();
            saveState();
        }, 300);
    } else {
        // Create initial popups - 15 fruits + 30 groups (total 45)
        const fruits = ["Banana", "Apple", "Papaya", "Mango", "Orange", "Grapes", "Strawberry", "Pineapple", 
                       "Watermelon", "Blueberry", "Raspberry", "Peach", "Pear", "Cherry", "Lemon", "Lime", 
                        "Kiwi", "Pomegranate", "Avocado", "Cantaloupe", "Rambutan", "Apricot", "Mangosteen", 
                        "Durian", "Dragonfruit"];
        
        const popupsToCreate = [...fruits];
        
        // Add 30 groups
        for (let i = 1; i <= 35; i++) {
            popupsToCreate.push(`Group ${String(i).padStart(2, '0')}`);
        }
        
        popupsToCreate.forEach(name => createPopup(name));
    }
});

// Save state before page unload
window.addEventListener('beforeunload', () => saveState());

// Also save state periodically (every 30 seconds)
setInterval(() => saveState(), 30000);

// Save state function
function saveState() {
    const popups = Array.from(container.querySelectorAll('.Chatpopup'));
    const tags = Array.from(tagContainer.querySelectorAll('.border-tag, .secondary-tag'))
        .filter(tag => tag.style.display !== 'none');

    const rect = container.getBoundingClientRect();
    const state = {
        popups: popups.map(popup => {
            const titleEl = popup.querySelector('.popup-title');
            return {
                title: titleEl ? titleEl.innerText : popup.querySelector('.Chatpopup-header')?.innerText || '',
                leftPercent: (popup.offsetLeft / rect.width) * 100,
                topPercent: (popup.offsetTop / rect.height) * 100,
                left: popup.style.left,
                top: popup.style.top,
                display: popup.style.display,
                closedByTag: popup.closedByTag || false,
                zIndex: popup.style.zIndex || '',
                secondaryTagSide: popup.secondaryTagSide || null,
                secondaryTagLeft: popup.secondaryTag?.style.left || null,
                secondaryTagTop: popup.secondaryTag?.style.top || null,
                isSortedSecondary: popup.secondaryTag ? true : false
            };
        }),
        tags: tags.map(tag => ({
            text: tag.getAttribute('data-original-text') || tag.dataset.originalText || tag.innerText.replace(/\n/g, '').replace('×', ''),
            left: tag.style.left,
            top: tag.style.top,
            right: tag.style.right,
            bottom: tag.style.bottom,
            whiteSpace: tag.style.whiteSpace,
            textAlign: tag.style.textAlign,
            background: tag.style.background,
            color: tag.style.color,
            border: tag.style.border,
            borderRadius: tag.style.borderRadius,
            innerText: tag.innerText.replace('×', ''),
            isSecondary: tag.classList.contains('secondary-tag'),
            side: tag.dataset.side || ''
        }))
    };

    localStorage.setItem('chatPopupState', JSON.stringify(state));
}

// Load state function
function loadState() {
    const savedState = localStorage.getItem('chatPopupState');
    if (savedState) {
        try {
            return JSON.parse(savedState);
        } catch (e) {
            console.error('Failed to parse saved state:', e);
            return null;
        }
    }
    return null;
}

// Create header markup helper
function buildHeaderMarkup(title, popup) {
    const header = document.createElement('div');
    header.classList.add('Chatpopup-header');
    header.innerHTML = `
        <span class="popup-title">${title}</span>
        <span><button class="popup-close" title="Close">×</button></span>
    `;
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 6px;';
    
    const closeBtn = header.querySelector('.popup-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popup && popup.secondaryTag) {
            popup.secondaryTag.remove();
            popup.secondaryTag = null;
        }
        popup.style.display = "none";
        popup.closedByTag = false;
        saveState();
    });

    return header;
}

// Create secondary tag function
function createSecondaryTag(popup, side) {
    const tag = document.createElement('div');
    tag.classList.add('secondary-tag');

    const titleEl = popup.querySelector('.popup-title');
    const title = titleEl ? titleEl.innerText : '';
    popup.secondaryTagSide = side;

    tag.innerText = (side === "top" || side === "bottom") ? title : [...title].join("\n");
    
    // For left side, swap close button and title positions
    let cssText = `
        position:absolute; background:rgba(246,246,245,0); border:1px solid black;
        border-radius:3px; color:#000; padding:4px 20px 4px 5px;
        font-size:12px; cursor:pointer;
        white-space:${(side === "top" || side === "bottom") ? 'nowrap' : 'pre-line'};
        text-align:center;
    `;
    
    if (side === "left") {
        cssText = `
            position:absolute; background:rgba(246,246,245,0); border:1px solid black;
            border-radius:3px; color:#000; padding:4px 5px 4px 20px;
            font-size:12px; cursor:pointer;
            white-space:${(side === "top" || side === "bottom") ? 'nowrap' : 'pre-line'};
            text-align:center;
        `;
    }
    
    tag.style.cssText = cssText;

    const closeBtn = createCloseButton();
    if (side === "left") {
        closeBtn.style.right = "auto";
        closeBtn.style.left = "2px";
    }
    tag.appendChild(closeBtn);
    tagContainer.appendChild(tag);

    // Position the tag
    const pRect = popup.getBoundingClientRect();
    const tagContainerRect = tagContainer.getBoundingClientRect();
    const positions = {
        'right': { left: pRect.right - tagContainerRect.left, top: pRect.top - tagContainerRect.top },
        'left': { left: pRect.left - tagContainerRect.left - tag.offsetWidth, top: pRect.top - tagContainerRect.top },
        'top': { left: pRect.left - tagContainerRect.left, top: pRect.top - tagContainerRect.top - tag.offsetHeight },
        'bottom': { left: pRect.left - tagContainerRect.left, top: pRect.bottom - tagContainerRect.top }
    };
    tag.style.left = positions[side].left + "px";
    tag.style.top = positions[side].top + "px";

    closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        popup.style.display = "none";
        popup.closedByTag = false;
        tag.remove();
        popup.secondaryTag = null;
        popup.secondaryTagSide = null;
        saveState();
    });

    tag.addEventListener('click', () => {
        popup.style.display = 'block';
        popup.closedByTag = false;
        saveState();
    });

    return tag;
}

// Restore popup from saved data
function restorePopup(popupData) {
    const popup = document.createElement('div');
    popup.classList.add('Chatpopup');
    popup.style.position = "absolute";
    
    if (popupData.leftPercent !== undefined && popupData.topPercent !== undefined) {
        const rect = container.getBoundingClientRect();
        popup.style.left = (popupData.leftPercent / 100) * rect.width + 'px';
        popup.style.top = (popupData.topPercent / 100) * rect.height + 'px';
        popup.leftPercent = popupData.leftPercent;
        popup.topPercent = popupData.topPercent;
    } else {
        popup.style.left = popupData.left || '50px';
        popup.style.top = popupData.top || '50px';
    }
    
    popup.style.display = popupData.display || 'block';
    popup.closedByTag = popupData.closedByTag || false;
    popup.style.zIndex = popupData.zIndex || '';
    
    const header = buildHeaderMarkup(popupData.title || 'Untitled', popup);
    popup.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('Chatpopup-body');
    popup.appendChild(body);
    
    container.appendChild(popup);
    
    const colors = getPopupColor(popupData.title);
    header.style.background = colors.background;
    header.style.color = colors.color;

    makeDraggable(popup);
}

// Restore tag from saved data
function restoreTag(tagData) {
    const tag = document.createElement('div');
    tag.classList.add(tagData.isSecondary ? 'secondary-tag' : 'border-tag');
    
    const closeBtn = createCloseButton();
    tag.innerHTML = tagData.innerText;
    tag.setAttribute('data-original-text', tagData.text);
    tag.dataset.originalText = tagData.text;
    if (tagData.side) tag.dataset.side = tagData.side;
    
    // For left side tags, swap close button and title positions
    let paddingValue = '4px 20px 4px 6px';
    if (tagData.side === 'left') {
        paddingValue = '4px 6px 4px 20px';
        closeBtn.style.right = "auto";
        closeBtn.style.left = "2px";
    }
    
    tag.appendChild(closeBtn);
    
    tag.style.cssText = `
        position:absolute; padding:${paddingValue}; cursor:pointer;
        font-size:12px; left:${tagData.left}; top:${tagData.top};
        right:${tagData.right}; bottom:${tagData.bottom};
        white-space:${tagData.whiteSpace}; text-align:${tagData.textAlign};
        background:${tagData.background}; color:${tagData.color};
        border:${tagData.border || '1px solid black'};
        border-radius:${tagData.borderRadius || '3px'};
    `;
    
    tagContainer.appendChild(tag);
    
    const popup = Array.from(container.querySelectorAll('.Chatpopup')).find(p => {
        const titleEl = p.querySelector('.popup-title');
        return titleEl && titleEl.innerText === tagData.text;
    });
    
    if (tagData.isSecondary && popup) {
        popup.secondaryTag = tag;
        popup.secondaryTagSide = tagData.side;
    }
    
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tag.style.display = "none";
        if (popup) {
            popup.style.display = "none";
            popup.closedByTag = true;
            saveState();
        }
    });
    
    tag.addEventListener('click', () => {
        tag.remove();
        if (popup) {
            popup.secondaryTag = null;
            popup.secondaryTagSide = null;
            popup.style.display = "block";
            popup.closedByTag = false;
            const pos = findFirstEmptyGridSlot(popup);
            popup.style.left = pos.left + "px";
            popup.style.top = pos.top + "px";
            saveState();
        }
    });
}

// Button event listeners
document.getElementById('Sorttagsbutton').addEventListener('click', () => {
    autoSortTags();
    saveState();
});

document.getElementById('CloseContainerBtn').addEventListener('click', () => {
    autoSortTags();
    saveState();
    document.querySelector('.chatcontainer').style.display = 'none';
    document.getElementById('OpenContainerBtn').style.display = 'inline-block';
});

document.getElementById('OpenContainerBtn').addEventListener('click', () => {
    document.querySelector('.chatcontainer').style.display = 'block';
    document.getElementById('OpenContainerBtn').style.display = 'none';
    autoSortTags();
});

window.addEventListener('load', () => {
    const containerEl = document.querySelector('.chatcontainer');
    const openBtn = document.getElementById('OpenContainerBtn');
    if (containerEl && containerEl.style.display !== 'none') {
        openBtn.style.display = 'none';
    }
});

function createPopup(title) {
    const popup = document.createElement('div');
    popup.classList.add('Chatpopup');
    popup.style.position = "absolute";
    
    const existingPopups = Array.from(container.querySelectorAll('.Chatpopup'));
    const popupIndex = existingPopups.length;
    const row = Math.floor(popupIndex / POPUPS_PER_ROW);
    const col = popupIndex % POPUPS_PER_ROW;
    
    popup.style.left = POPUP_GAP + (col * (POPUP_WIDTH + POPUP_GAP)) + "px";
    popup.style.top = POPUP_GAP + 30 + (row * ROW_HEIGHT) + "px";
    popup.closedByTag = false;
    
    const header = buildHeaderMarkup(title, popup);
    popup.appendChild(header);
    const body = document.createElement('div');
    body.classList.add('Chatpopup-body');
    popup.appendChild(body);
    
    container.appendChild(popup);
    
    const colors = getPopupColor(title);
    header.style.background = colors.background;
    header.style.color = colors.color;
    
    makeDraggable(popup);
}

function makeDraggable(popup) {
    let offsetX, offsetY, isDragging = false, draggedToEdge = false;
    
    popup.addEventListener('mousedown', (e) => {
        if (e.target.closest('.popup-close')) return;
        isDragging = true;
        draggedToEdge = false;
        offsetX = e.clientX - popup.offsetLeft;
        offsetY = e.clientY - popup.offsetTop;
        popup.style.zIndex = 1000;
        if (popup.secondaryTag) {
            popup.secondaryTag.style.zIndex = 1001;
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        const rect = container.getBoundingClientRect();
        const pRect = popup.getBoundingClientRect();
        
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.leftPercent = (x / rect.width) * 100;
        popup.topPercent = (y / rect.height) * 100;
        
        // Check if dragged to edge to create tag
        if (!draggedToEdge) {
            let hitTop = y <= -(pRect.height * 0.8);
            let hitBottom = y >= rect.height - (pRect.height * 0.2);
            let hitLeft = x <= -(pRect.width * 0.8);
            let hitRight = x >= rect.width - (pRect.width * 0.2);
            
            if (hitTop || hitBottom || hitLeft || hitRight) {
                createTag(popup, hitTop, hitBottom, hitLeft, hitRight);
                if (hitLeft) popup.style.left = "0px";
                if (hitRight) popup.style.left = (rect.width - pRect.width) + "px";
                if (hitTop) popup.style.top = "0px";
                if (hitBottom) popup.style.top = (rect.height - pRect.height) + "px";
                popup.style.display = "none";
                draggedToEdge = true;
                popup.closedByTag = false;
                saveState();
            }
        }
        
        // Manage secondary tag visuals
        const secondaryTagMap = {
            left: { side: 'right', left: pRect.right - rect.left, top: pRect.top - rect.top },
            right: { side: 'left', left: pRect.left - rect.left - (popup.secondaryTag?.offsetWidth || 0), top: pRect.top - rect.top },
            top: { side: 'bottom', left: pRect.left - rect.left, top: pRect.bottom - rect.top },
            bottom: { side: 'top', left: pRect.left - rect.left, top: pRect.top - rect.top - (popup.secondaryTag?.offsetHeight || 0) }
        };
        
        let condition = null;
        if (x <= 0) condition = 'left';
        else if (x + pRect.width >= rect.width) condition = 'right';
        else if (y <= 0) condition = 'top';
        else if (y + pRect.height >= rect.height) condition = 'bottom';
        
        if (condition) {
            if (!popup.secondaryTag) {
                popup.secondaryTag = createSecondaryTag(popup, secondaryTagMap[condition].side);
            }
            popup.secondaryTag.style.left = secondaryTagMap[condition].left + "px";
            popup.secondaryTag.style.top = secondaryTagMap[condition].top + "px";
        } else if (popup.secondaryTag) {
            popup.secondaryTag.remove();
            popup.secondaryTag = null;
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (popup.secondaryTag) {
                popup.secondaryTag.style.zIndex = 100;
            }
            saveState();
        }
    });
}

function createTag(popup, top, bottom, left, right) {
    const titleEl = popup.querySelector('.popup-title');
    const title = titleEl ? titleEl.innerText : popup.querySelector('.Chatpopup-header')?.innerText || '';
    const tag = document.createElement('div');
    tag.classList.add('border-tag');
    
    const closeBtn = createCloseButton();
    tag.innerHTML = (left || right) ? [...title].join("\n") : title;
    tag.setAttribute('data-original-text', title);
    
    // For right border, swap close button and title positions
    if (right) {
        closeBtn.style.right = "auto";
        closeBtn.style.left = "2px";
        tag.style.cssText = `
            position:absolute; padding:4px 6px 4px 20px; cursor:pointer;
            font-size:12px; white-space:${(left || right) ? 'pre-line' : 'nowrap'};
            text-align:center;
        `;
    } else {
        tag.style.cssText = `
            position:absolute; padding:4px 20px 4px 6px; cursor:pointer;
            font-size:12px; white-space:${(left || right) ? 'pre-line' : 'nowrap'};
            text-align:center;
        `;
    }
    
    tag.appendChild(closeBtn);
    
    const colors = getPopupColor(title);
    tag.style.background = colors.background;
    tag.style.color = colors.color;
    
    const rect = container.getBoundingClientRect();
    const sortButton = document.getElementById('Sorttagsbutton');
    const sortRect = sortButton.getBoundingClientRect();
    
    let x = popup.offsetLeft, y = popup.offsetTop;
    
    if (top) { tag.style.top = "0px"; tag.style.left = Math.max(x, 50) + "px"; }
    else if (bottom) { tag.style.bottom = "0px"; tag.style.left = x + "px"; }
    else if (left) { tag.style.left = "0px"; tag.style.top = Math.max(y, 30) + "px"; }
    else if (right) { tag.style.right = "0px"; tag.style.top = y + "px"; }
    
    tagContainer.appendChild(tag);
    
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tag.style.display = "none";
        popup.style.display = "none";
        popup.closedByTag = true;
        saveState();
    });
    
    const tags = Array.from(tagContainer.querySelectorAll('.border-tag')).filter(t => t !== tag);
    let currentSide = left ? 'left' : right ? 'right' : top ? 'top' : 'bottom';
    let initialSide = currentSide;
    let attemptedBorders = new Set([currentSide]);

    // UPDATED: Check if current border has available space before moving
    let safetyCounter = 0;
    const SAFETY_LIMIT = 300;

    while (safetyCounter < SAFETY_LIMIT) {
        safetyCounter++;
        
        // Try to position on current border
        const hasSpace = positionTagOnBorder(tag, currentSide, title, x, y, closeBtn, initialSide);
        
        if (!hasSpace) {
            // Current border is full, move to next available border
            const requiredSpace = (currentSide === 'left' || currentSide === 'right') ? tag.offsetHeight : tag.offsetWidth;
            const nextSide = findNearestAvailableBorder(currentSide, requiredSpace, popup);

            // Prevent moving to opposite border
            const isVerticalInitial = initialSide === 'left' || initialSide === 'right';
            const isVerticalNext = nextSide === 'left' || nextSide === 'right';
            
            let validNextSide = nextSide;
            if (isVerticalInitial && isVerticalNext) {
                validNextSide = null;
            } else if (!isVerticalInitial && !isVerticalNext) {
                validNextSide = null;
            }

            if (validNextSide && !attemptedBorders.has(validNextSide)) {
                attemptedBorders.add(validNextSide);
                currentSide = validNextSide;
                
                left = (currentSide === 'left');
                right = (currentSide === 'right');
                top = (currentSide === 'top');
                bottom = (currentSide === 'bottom');
                continue; // Try positioning on the new border
            } else {
                // No valid border found, stay where we are
                break;
            }
        } else {
            // Successfully placed, exit loop
            break;
        }
    }

    if (safetyCounter >= SAFETY_LIMIT) {
        console.warn("Tag reposition loop stopped early to avoid browser freeze.");
    }
    
    tag.addEventListener('click', () => {
        tag.remove();
        popup.style.display = "block";
        popup.closedByTag = false;
        const pos = findFirstEmptyGridSlot(popup);
        popup.style.left = pos.left + "px";
        popup.style.top = pos.top + "px";
        saveState();
    });
}

function autoSortTags() {
    const rect = container.getBoundingClientRect();
    const START_OFFSET = 55;
    const SEPARATOR_GAP = 30; // Gap between fruit and group tags

    function getTagText(tag) {
        return (tag.dataset.popupTitle || tag.dataset.originalText || tag.innerText)
            .replace(/\n/g, '').replace('×', '').trim();
    }

    const primaryTitles = new Set(
        Array.from(tagContainer.querySelectorAll('.border-tag'))
            .filter(t => t.style.display !== 'none')
            .map(t => getTagText(t))
    );

    const allTags = Array.from(tagContainer.querySelectorAll('.border-tag, .secondary-tag'))
        .filter(tag => {
            if (tag.style.display === 'none') return false;
            const title = getTagText(tag);
            
            if (tag.classList.contains('secondary-tag') && primaryTitles.has(title)) {
                tag.remove();
                return false;
            }
            
            if (tag.classList.contains('secondary-tag')) {
                const popup = Array.from(container.querySelectorAll('.Chatpopup'))
                    .find(p => p.secondaryTag === tag);
                if (popup && popup.style.display === 'none' && popup.closedByTag !== true) return false;
            }
            return true;
        });

    // Separate fruit tags and group tags
    const fruitTags = [];
    const groupTags = [];
    const fruitNames = ["Banana", "Apple", "Papaya", "Mango", "Orange", "Grapes", "Strawberry", "Pineapple", 
                        "Watermelon", "Blueberry", "Raspberry", "Peach", "Pear", "Cherry", "Lemon", "Lime", 
                        "Kiwi", "Pomegranate", "Avocado", "Cantaloupe", "Rambutan", "Apricot", "Mangosteen", 
                        "Durian", "Dragonfruit"];
    
    allTags.forEach(tag => {
        const text = getTagText(tag);
        if (fruitNames.some(fruit => text.toLowerCase().includes(fruit.toLowerCase()))) {
            fruitTags.push(tag);
        } else {
            groupTags.push(tag);
        }
    });

    // Sort each group separately
    fruitTags.sort((a, b) => getTagText(a).localeCompare(getTagText(b)));
    groupTags.sort((a, b) => getTagText(a).localeCompare(getTagText(b)));
    
    // Combine with fruit tags first, then group tags
    const tags = [...fruitTags, ...groupTags];

    let pos = { top: START_OFFSET, right: START_OFFSET, bottom: START_OFFSET, left: START_OFFSET };
    let tagCategoryIndex = 0;

    tags.forEach((tag, index) => {
        const text = getTagText(tag);
        const isSecondary = tag.classList.contains('secondary-tag');
        
        // Add separator gap before switching from fruit to group tags
        if (index === fruitTags.length && fruitTags.length > 0 && groupTags.length > 0) {
            pos.top += SEPARATOR_GAP;
            pos.right += SEPARATOR_GAP;
            pos.bottom += SEPARATOR_GAP;
            pos.left += SEPARATOR_GAP;
        }
        
        let side = null;
        if (isSecondary) {
            if (tag.style.left && parseFloat(tag.style.left) <= 10) side = 'left';
            else if (tag.style.right && parseFloat(tag.style.right) <= 10) side = 'right';
            else if (tag.style.top && parseFloat(tag.style.top) <= 10) side = 'top';
            else if (tag.style.bottom && parseFloat(tag.style.bottom) <= 10) side = 'bottom';
        }
        tag.dataset.side = side || '';

        if (!tag.dataset.originalText) tag.dataset.originalText = text;

        const oldCloseBtn = tag.querySelector('span');
        if (oldCloseBtn) oldCloseBtn.remove();

        tag.innerHTML = '';
        tag.style.whiteSpace = 'nowrap';
        tag.style.textAlign = 'center';
        tag.innerHTML = (isSecondary && (tag.dataset.side === 'left' || tag.dataset.side === 'right')) ? 
                        [...text].join('\n') : text;

        const closeBtn = createCloseButton();
        // For left side tags, swap close button and title positions
        if (tag.dataset.side === 'left') {
            closeBtn.style.right = "auto";
            closeBtn.style.left = "2px";
        }
        tag.appendChild(closeBtn);

        const popup = Array.from(container.querySelectorAll('.Chatpopup'))
            .find(p => p.querySelector('.popup-title')?.innerText.trim() === text);

        if (isSecondary && popup) {
            const header = popup.querySelector('.Chatpopup-header');
            if (header) {
                tag.style.background = header.style.background;
                tag.style.color = header.style.color;
                tag.style.border = "1px solid " + header.style.background;
                tag.style.borderRadius = "3px";
            }
        }

        closeBtn.onclick = e => {
            e.stopPropagation();
            tag.style.display = 'none';
            if (popup) popup.style.display = 'none';
            saveState();
        };

        if (isSecondary && popup) {
            popup.style.display = 'none';
            popup.closedByTag = true;
            popup.secondaryTag = tag;
            popup.secondaryTagSide = tag.dataset.side;

            tag.onclick = () => {
                popup.style.display = 'block';
                popup.closedByTag = false;
                tag.remove();
                
                if (popup.secondaryTag && popup.secondaryTag !== tag) popup.secondaryTag.remove();
                popup.secondaryTag = null;
                popup.secondaryTagSide = null;
                
                const pRect = popup.getBoundingClientRect();
                const isAtLeftBorder = popup.offsetLeft <= 0;
                const isAtRightBorder = popup.offsetLeft + pRect.width >= rect.width;
                const isAtTopBorder = popup.offsetTop <= 0;
                const isAtBottomBorder = popup.offsetTop + pRect.height >= rect.height;
                
                if (isAtLeftBorder || isAtRightBorder || isAtTopBorder || isAtBottomBorder) {
                    let newSide = null;
                    if (isAtLeftBorder) newSide = "right";
                    else if (isAtRightBorder) newSide = "left";
                    else if (isAtTopBorder) newSide = "bottom";
                    else if (isAtBottomBorder) newSide = "top";
                    
                    popup.secondaryTag = createSecondaryTag(popup, newSide);
                    popup.secondaryTagSide = newSide;
                }
                saveState();
            };
        } else if (!isSecondary && popup) {
            popup.style.display = 'none';
            popup.closedByTag = true;
            
            tag.onclick = () => {
                tag.remove();
                popup.style.display = 'block';
                popup.closedByTag = false;
                
                if (popup.secondaryTag) {
                    popup.secondaryTag.remove();
                    popup.secondaryTag = null;
                    popup.secondaryTagSide = null;
                }
                
                const pos = findFirstEmptyGridSlot(popup);
                popup.style.left = pos.left + "px";
                popup.style.top = pos.top + "px";
                saveState();
            };
        }

        // Clockwise placement - simple sequential without jumping
        if (pos.top + tag.offsetWidth <= rect.width - START_OFFSET) {
            tag.style.top = '1px';
            tag.style.left = pos.top + 'px';
            tag.style.right = tag.style.bottom = '';
            pos.top += tag.offsetWidth + TAG_GAP;
            return;
        }

        tag.innerHTML = [...text].join('\n');
        // For left side tags, swap close button and title positions
        if (tag.dataset.side === 'left') {
            closeBtn.style.right = "auto";
            closeBtn.style.left = "2px";
        }
        tag.appendChild(closeBtn);
        tag.style.whiteSpace = 'pre-line';

        if (pos.right + tag.offsetHeight <= rect.height - START_OFFSET) {
            tag.style.right = TAG_GAP + 'px';
            tag.style.top = pos.right + 'px';
            tag.style.left = tag.style.bottom = '';
            pos.right += tag.offsetHeight + TAG_GAP;
            return;
        }

        tag.innerHTML = text;
        tag.appendChild(closeBtn);
        tag.style.whiteSpace = 'nowrap';

        if (pos.bottom + tag.offsetWidth <= rect.width - START_OFFSET) {
            tag.style.bottom = TAG_GAP + 'px';
            tag.style.left = pos.bottom + 'px';
            tag.style.top = tag.style.right = '';
            pos.bottom += tag.offsetWidth + TAG_GAP;
            return;
        }

        tag.innerHTML = [...text].join('\n');
        tag.appendChild(closeBtn);
        tag.style.whiteSpace = 'pre-line';

        if (pos.left + tag.offsetHeight <= rect.height - START_OFFSET) {
            tag.style.left = TAG_GAP + 'px';
            tag.style.top = pos.left + 'px';
            tag.style.right = tag.style.bottom = '';
            // For left side tags, apply swapped padding
            tag.style.paddingLeft = '20px';
            tag.style.paddingRight = '6px';
            tag.dataset.side = 'left';
            pos.left += tag.offsetHeight + TAG_GAP;
        }
    });
}

setInterval(() => autoSortTags(), 180000);

function clearSavedState() {
    localStorage.removeItem('chatPopupState');
    console.log('Saved state cleared');
}

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        repositionPopupsOnResize();
        repositionTagsOnResize();
        saveState();
    }, 100);
});

function repositionPopupsOnResize() {
    const rect = container.getBoundingClientRect();
    const popups = Array.from(container.querySelectorAll('.Chatpopup'));
    
    popups.forEach(popup => {
        if (popup.style.display === 'none') return;
        
        const popupWidth = popup.offsetWidth;
        const popupHeight = popup.offsetHeight;
        let popupLeft = popup.offsetLeft;
        let popupTop = popup.offsetTop;
        const threshold = 5;
        
        const wasAtLeftBorder = popupLeft <= threshold;
        const wasAtRightBorder = popupLeft + popupWidth >= rect.width - threshold;
        const wasAtTopBorder = popupTop <= threshold;
        const wasAtBottomBorder = popupTop + popupHeight >= rect.height - threshold;
        
        if (popup.leftPercent !== undefined && popup.topPercent !== undefined) {
            let newLeft = (popup.leftPercent / 100) * rect.width;
            let newTop = (popup.topPercent / 100) * rect.height;
            
            if (wasAtLeftBorder) newLeft = 0;
            else if (wasAtRightBorder) newLeft = Math.max(0, rect.width - popupWidth);
            
            if (wasAtTopBorder) newTop = 0;
            else if (wasAtBottomBorder) newTop = Math.max(0, rect.height - popupHeight);
            
            if (!wasAtLeftBorder && !wasAtRightBorder && newLeft + popupWidth > rect.width) {
                newLeft = Math.max(0, rect.width - popupWidth);
            }
            if (!wasAtTopBorder && !wasAtBottomBorder && newTop + popupHeight > rect.height) {
                newTop = Math.max(0, rect.height - popupHeight);
            }
            
            popupLeft = newLeft;
            popupTop = newTop;
            popup.style.left = newLeft + 'px';
            popup.style.top = newTop + 'px';
        }
        
        const isAtLeftBorder = popupLeft <= threshold;
        const isAtRightBorder = popupLeft + popupWidth >= rect.width - threshold;
        const isAtTopBorder = popupTop <= threshold;
        const isAtBottomBorder = popupTop + popupHeight >= rect.height - threshold;
        
        const titleEl = popup.querySelector('.popup-title');
        const title = titleEl ? titleEl.innerText : '';
        const hasPrimaryTag = Array.from(tagContainer.querySelectorAll('.border-tag'))
            .some(tag => {
                const tagText = tag.getAttribute('data-original-text') || tag.innerText.replace(/\n/g, '').replace('×', '');
                return tagText === title && tag.style.display !== 'none';
            });
        
        if (!hasPrimaryTag) {
            let newSide = null;
            if (isAtLeftBorder) newSide = "right";
            else if (isAtRightBorder) newSide = "left";
            else if (isAtTopBorder) newSide = "bottom";
            else if (isAtBottomBorder) newSide = "top";
            
            if (newSide) {
                if (!popup.secondaryTag || popup.secondaryTagSide !== newSide) {
                    if (popup.secondaryTag) popup.secondaryTag.remove();
                    popup.secondaryTag = createSecondaryTag(popup, newSide);
                    popup.secondaryTagSide = newSide;
                }
                
                if (popup.secondaryTag) {
                    const tagWidth = popup.secondaryTag.offsetWidth;
                    const tagHeight = popup.secondaryTag.offsetHeight;
                    const positions = {
                        'right': { top: popupTop, left: popupLeft + popupWidth },
                        'left': { top: popupTop, left: popupLeft - tagWidth },
                        'bottom': { left: popupLeft, top: popupTop + popupHeight },
                        'top': { left: popupLeft, top: popupTop - tagHeight }
                    };
                    popup.secondaryTag.style.top = positions[popup.secondaryTagSide].top + "px";
                    popup.secondaryTag.style.left = positions[popup.secondaryTagSide].left + "px";
                }
            } else if (popup.secondaryTag) {
                popup.secondaryTag.remove();
                popup.secondaryTag = null;
                popup.secondaryTagSide = null;
            }
        } else if (popup.secondaryTag) {
            popup.secondaryTag.remove();
            popup.secondaryTag = null;
            popup.secondaryTagSide = null;
        }
    });
}

function repositionTagsOnResize() {
    const rect = tagContainer.getBoundingClientRect();
    const tags = Array.from(tagContainer.querySelectorAll('.border-tag'))
        .filter(tag => tag.style.display !== 'none');
    
    tags.forEach(tag => {
        const tRect = tag.getBoundingClientRect();
        
        if (tag.style.top === "1px" || tag.style.top === "0px") {
            let left = parseFloat(tag.style.left);
            if (left + tRect.width > rect.width) {
                tag.style.left = Math.max(0, rect.width - tRect.width) + "px";
            }
        }
        
        if (tag.style.bottom && tag.style.bottom !== "") {
            let left = parseFloat(tag.style.left);
            if (left + tRect.width > rect.width) {
                tag.style.left = Math.max(0, rect.width - tRect.width) + "px";
            }
        }
        
        if (tag.style.right && tag.style.right !== "" && tag.style.right !== "0px") {
            let top = parseFloat(tag.style.top);
            if (top + tRect.height > rect.height) {
                tag.style.top = Math.max(0, rect.height - tRect.height) + "px";
            }
        }
        
        if (tag.style.left === "3px" || (tag.style.left && parseFloat(tag.style.left) < 10)) {
            let top = parseFloat(tag.style.top);
            if (top + tRect.height > rect.height) {
                tag.style.top = Math.max(0, rect.height - tRect.height) + "px";
            }
        }
    });
}

 //  REMOVE OLD MEMORY ON EVERY PAGE LOAD
localStorage.removeItem('chatPopupState');
console.log("Previous popup memory cleared!");