const container = document.querySelector('.chatWrapper');
const btn = document.getElementById('Addpopups');
let popupCount = 0;

// Load saved state on page load
window.addEventListener('load', () => {
    const savedState = loadState();
    
    if (savedState && savedState.popups.length > 0) {
        //  FIRST restore primary tags
        savedState.tags?.forEach(tagData => restoreTag(tagData));
        
        // THEN restore popups 
        savedState.popups.forEach((popupData, index) => {
            restorePopup(popupData);
        });
        
        // Now check if any popups were closed by user/tag and should reopen
        setTimeout(() => {
            const allPopups = Array.from(container.querySelectorAll('.Chatpopup'));
            const rect = container.getBoundingClientRect();
            
            allPopups.forEach(popup => {
                const titleEl = popup.querySelector('.popup-title');
                const title = titleEl ? titleEl.innerText : '';
                
                // Check if there's a visible tag for this popup
                const hasVisibleTag = Array.from(container.querySelectorAll('.border-tag'))
                    .some(tag => {
                        const tagText = tag.getAttribute('data-original-text') || tag.innerText.replace(/\n/g, '').replace('×', '');
                        return tagText === title && tag.style.display !== 'none';
                    });
                
                // If popup is hidden and there's NO visible tag, it was closed by user - reopen it
                if (popup.style.display === 'none' && !hasVisibleTag) {
                    popup.style.display = 'block';
                    popup.closedByTag = false;
                    
                    // Find a safe initial position (avoid overlapping with visible popups)
                    const pRect = popup.getBoundingClientRect();
                    const GAP = 10;
                    
                    const visiblePopups = Array.from(container.querySelectorAll('.Chatpopup'))
                        .filter(p => p !== popup && p.style.display !== 'none');
                    
                    let newLeft = 40;
                    let newTop = 30;
                    let safe = false;
                    
                    while (!safe) {
                        safe = true;
                        for (let other of visiblePopups) {
                            const oRect = other.getBoundingClientRect();
                            const overlap =
                                !(newLeft + pRect.width <= oRect.left ||
                                newLeft >= oRect.right ||
                                newTop + pRect.height <= oRect.top ||
                                newTop >= oRect.bottom);
                            
                            if (overlap) {
                                newLeft += GAP;
                                safe = false;
                                break;
                            }
                        }
                        if (newLeft + pRect.width > rect.width) newLeft = 10;
                        if (newTop + pRect.height > rect.height) newTop = 10;
                    }
                    
                    popup.style.left = newLeft + "px";
                    popup.style.top = newTop + "px";
                }
            });
            
            // Ensure secondary tags are properly linked to their popups
            const secondaryTags = Array.from(container.querySelectorAll('.secondary-tag'));
            secondaryTags.forEach(tag => {
                const titleText = tag.innerText.replace(/\n/g, '').replace('×', '').trim();
                const popup = Array.from(container.querySelectorAll('.Chatpopup')).find(p => {
                    const titleEl = p.querySelector('.popup-title');
                    return titleEl && titleEl.innerText === titleText;
                });
                if (popup && !popup.secondaryTag) {
                    popup.secondaryTag = tag;
                    // Extract side from tag's position
                    if (tag.style.left && parseFloat(tag.style.left) <= 10) popup.secondaryTagSide = 'left';
                    else if (tag.style.right && parseFloat(tag.style.right) <= 10) popup.secondaryTagSide = 'right';
                    else if (tag.style.top && parseFloat(tag.style.top) <= 10) popup.secondaryTagSide = 'top';
                    else if (tag.style.bottom && parseFloat(tag.style.bottom) <= 10) popup.secondaryTagSide = 'bottom';
                }
            });
            
            autoSortTags();
            saveState(); // save sorted state
        }, 300); // small delay to allow DOM render
    } else {
        createPopup("Banana");
        createPopup("Apple");
        createPopup("Papaya");
        createPopup("Mango");
    }
});

// Save state before page unload
window.addEventListener('beforeunload', () => {
    saveState();
});

// Also save state periodically (every 30 seconds)
setInterval(() => {
    saveState();
}, 30000);

// Save state function
function saveState() {
    const popups = Array.from(container.querySelectorAll('.Chatpopup'));
    const tags = Array.from(container.querySelectorAll('.border-tag, .secondary-tag'))
        .filter(tag => tag.style.display !== 'none'); // Only save visible tags

    const state = {
        popups: popups.map(popup => {
            const titleEl = popup.querySelector('.popup-title');
            return {
                title: titleEl ? titleEl.innerText : popup.querySelector('.Chatpopup-header')?.innerText || '',
                left: popup.style.left,
                top: popup.style.top,
                display: popup.style.display,
                closedByTag: popup.closedByTag || false,
                zIndex: popup.style.zIndex || '',
                
                // Save secondary tag info, including sorted secondary tags
                secondaryTagSide: popup.secondaryTagSide || null,
                secondaryTagLeft: popup.secondaryTag?.style.left || null,
                secondaryTagTop: popup.secondaryTag?.style.top || null,
                isSortedSecondary: popup.secondaryTag ? true : false // Mark as sorted secondary
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
            border: tag.style.border, // Save border for secondary tags
            borderRadius: tag.style.borderRadius, // Save border radius
            innerText: tag.innerText.replace('×', ''),
            isSecondary: tag.classList.contains('secondary-tag'),
            side: tag.dataset.side || '' // Save side info for secondary tags
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

// Create header markup helper (title + close button) and attach close handler
function buildHeaderMarkup(title, popup) {
    const header = document.createElement('div');
    header.classList.add('Chatpopup-header');
    header.innerHTML = `
        <span class="popup-title">${title}</span>
        <span><button class="popup-close" title="Close">×</button></span>
    `;

    // style adjustments can be done with CSS; minimal inline fallback:
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '4px 6px';
    
    // attach close behavior
    const closeBtn = header.querySelector('.popup-close');
    
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // avoid triggering drag start

        if (popup && popup.secondaryTag) {
            popup.secondaryTag.remove();
            popup.secondaryTag = null;
        }

        // Hide the popup and mark it as closed by user (not by tag)
        popup.style.display = "none";
        popup.closedByTag = false; // Closed by user, not tag
        saveState();
    });

    return header;
}

// MOVED OUTSIDE: createSecondaryTag function (now globally accessible)
function createSecondaryTag(popup, side) {
    const tag = document.createElement('div');
    tag.classList.add('secondary-tag');

    const titleEl = popup.querySelector('.popup-title');
    const title = titleEl ? titleEl.innerText : '';

    popup.secondaryTagSide = side;

    // Set initial tag text
    if (side === "top" || side === "bottom") {
        tag.innerText = title;
        tag.style.whiteSpace = 'nowrap';
        tag.style.textAlign = 'center';
    } else {
        tag.innerText = [...title].join("\n");
        tag.style.whiteSpace = 'pre-line';
        tag.style.textAlign = 'center';
    }

    // Basic styling
    tag.style.position = "absolute";
    tag.style.background = "rgba(246,246,245,0)";
    tag.style.border = "1px solid black";
    tag.style.borderRadius = "3px";
    tag.style.color = "#000";
    tag.style.padding = "4px 20px 4px 5px";
    tag.style.fontSize = "12px";
    tag.style.cursor = "pointer";

    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '2px';
    closeBtn.style.right = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0 2px';
    closeBtn.style.color = 'inherit';
    closeBtn.style.zIndex = '10';
    closeBtn.style.background = 'rgba(0,0,0,0.1)';
    closeBtn.style.borderRadius = '2px';
    closeBtn.title = 'Close';

    tag.appendChild(closeBtn);

    // Add to container
    container.appendChild(tag);

    // Position the tag based on popup's current position and side
    const pRect = popup.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    switch (side) {
        case 'right':
            tag.style.left = (pRect.right - containerRect.left) + "px";
            tag.style.top = (pRect.top - containerRect.top) + "px";
            break;
        case 'left':
            tag.style.left = (pRect.left - containerRect.left - tag.offsetWidth) + "px";
            tag.style.top = (pRect.top - containerRect.top) + "px";
            break;
        case 'top':
            tag.style.left = (pRect.left - containerRect.left) + "px";
            tag.style.top = (pRect.top - containerRect.top - tag.offsetHeight) + "px";
            break;
        case 'bottom':
            tag.style.left = (pRect.left - containerRect.left) + "px";
            tag.style.top = (pRect.bottom - containerRect.top) + "px";
            break;
    }

    // Close button click
    closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        popup.style.display = "none";
        popup.closedByTag = false;
        tag.remove();
        popup.secondaryTag = null;
        popup.secondaryTagSide = null;
        saveState();
    });

    // Click on secondary tag restores popup
    tag.addEventListener('click', () => {
        popup.style.display = 'block';
        popup.closedByTag = false;
        tag.remove();
        popup.secondaryTag = createSecondaryTag(popup, side);
        popup.secondaryTagSide = side;
        saveState();
    });

    return tag;
}


// Restore popup from saved data
function restorePopup(popupData) {
    const popup = document.createElement('div');
    popup.classList.add('Chatpopup');
    popup.style.position = "absolute";
    popup.style.left = popupData.left || '50px';
    popup.style.top = popupData.top || '50px';
    
    // Restore the exact display state - only show if it was visible AND not closed by tag
    popup.style.display = popupData.display || 'block';
    popup.closedByTag = popupData.closedByTag || false;
    
    popup.style.zIndex = popupData.zIndex || '';
    
    // build header markup (ensures .popup-title exists)
    const header = buildHeaderMarkup(popupData.title || 'Untitled', popup);
    popup.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('Chatpopup-body');
    popup.appendChild(body);
    
    container.appendChild(popup);
    
    const headerText = (popup.querySelector('.popup-title')?.innerText || '').toLowerCase();
    
    // Apply color styling based on title
    if (headerText.includes("papaya")) {
        header.style.background = "#8B0000";
        header.style.color = "#FFFFFF";
    } else if (headerText.includes("apple")) {
        header.style.background = "#00008B";
        header.style.color = "#FFFFFF";
    } else if (headerText.includes("mango")) {
        header.style.background = "#5C4033";
        header.style.color = "#FFFFFF";
    }

    makeDraggable(popup);

}

// Restore tag from saved data
function restoreTag(tagData) {
    const tag = document.createElement('div');
    
    // Set class based on whether it's secondary
    if (tagData.isSecondary) {
        tag.classList.add('secondary-tag');
    } else {
        tag.classList.add('border-tag');
    }
    
    // Create close button for restored tag
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '2px';
    closeBtn.style.right = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0 2px';
    closeBtn.style.color = 'inherit';
    closeBtn.style.zIndex = '10';
    closeBtn.style.background = 'rgba(0,0,0,0.1)';
    closeBtn.style.borderRadius = '2px';
    closeBtn.title = 'Close';
    
    tag.innerHTML = tagData.innerText;
    tag.appendChild(closeBtn);
    tag.setAttribute('data-original-text', tagData.text);
    tag.dataset.originalText = tagData.text;
    if (tagData.side) {
        tag.dataset.side = tagData.side;
    }
    
    tag.style.position = "absolute";
    tag.style.padding = "4px 20px 4px 6px"; // More padding on right for close button
    tag.style.cursor = "pointer";
    tag.style.fontSize = "12px";
    tag.style.left = tagData.left;
    tag.style.top = tagData.top;
    tag.style.right = tagData.right;
    tag.style.bottom = tagData.bottom;
    tag.style.whiteSpace = tagData.whiteSpace;
    tag.style.textAlign = tagData.textAlign;
    tag.style.background = tagData.background;
    tag.style.color = tagData.color;
    tag.style.border = tagData.border || "1px solid black"; // Restore or apply default border
    tag.style.borderRadius = tagData.borderRadius || "3px"; // Restore or apply default border radius
    
    container.appendChild(tag);
    
    // Find the corresponding popup for close button
    const popups = Array.from(container.querySelectorAll('.Chatpopup'));
    const popup = popups.find(p => {
        const titleEl = p.querySelector('.popup-title');
        return titleEl && titleEl.innerText === tagData.text;
    });
    
    // For secondary tags, link them to popup
    if (tagData.isSecondary && popup) {
        popup.secondaryTag = tag;
        popup.secondaryTagSide = tagData.side;
    }
    
    // Close button click handler
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tag click event
        tag.style.display = "none"; // Hide the tag
        if (popup) {
            popup.style.display = "none";
            popup.closedByTag = true; // Mark as closed by tag
            saveState();
        }
    });
    
    // Add click event to restore popup
    tag.addEventListener('click', () => {
        const title = tagData.text;
        tag.remove();
        if (popup) {
            popup.secondaryTag = null; // Clear reference since tag was removed
            popup.secondaryTagSide = null;
        }
        
        // Find the corresponding popup (compare only .popup-title text)
        const popups = Array.from(container.querySelectorAll('.Chatpopup'));
        const popup = popups.find(p => {
            const titleEl = p.querySelector('.popup-title');
            return titleEl && titleEl.innerText === title;
        });
        
        if (popup) {
            popup.style.display = "block";
            popup.closedByTag = false; // Reset closed by tag flag
            const rect = container.getBoundingClientRect();
            const pRectNow = popup.getBoundingClientRect();
            const GAP = 10;
            
            const visiblePopups = Array.from(container.querySelectorAll('.Chatpopup'))
                .filter(p => p !== popup && p.style.display !== 'none');
            
            let newLeft = 40;
            let newTop = 30;
            let safe = false;
            
            while (!safe) {
                safe = true;
                for (let other of visiblePopups) {
                    const oRect = other.getBoundingClientRect();
                    const overlap =
                        !(newLeft + pRectNow.width <= oRect.left ||
                        newLeft >= oRect.right ||
                        newTop + pRectNow.height <= oRect.top ||
                        newTop >= oRect.bottom);
                    
                    if (overlap) {
                        newLeft += GAP;
                        safe = false;
                        break;
                    }
                }
                if (newLeft + pRectNow.width > rect.width) newLeft = 10;
                if (newTop + pRectNow.height > rect.height) newTop = 10;
            }
            
            popup.style.left = newLeft + "px";
            popup.style.top = newTop + "px";
            saveState(); // Save after restoring
        }
    });
}

document.getElementById('Sorttagsbutton').addEventListener('click', () => {
    autoSortTags();
    saveState(); // Save after sorting
});

document.getElementById('CloseContainerBtn').addEventListener('click', () => {
    autoSortTags();
    saveState(); // Save before closing
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

const POPUP_GAP = 10;

function createPopup(title) {
    const popup = document.createElement('div');
    popup.classList.add('Chatpopup');
    popup.style.position = "absolute";
    
    const existingPopups = Array.from(container.querySelectorAll('.Chatpopup'));
    let newLeft = POPUP_GAP;
    
    if (existingPopups.length > 0) {
        const lastPopup = existingPopups[existingPopups.length - 1];
        const lastRect = lastPopup.getBoundingClientRect();
        newLeft = lastRect.right - container.getBoundingClientRect().left + POPUP_GAP;
    }
    
    popup.style.left = newLeft + 50 + "px";
    popup.style.top = POPUP_GAP + 30 + "px";
    popup.closedByTag = false; // Initialize flag
    
    // header (title + close) and body
    const header = buildHeaderMarkup(title, popup);
    popup.appendChild(header);
    const body = document.createElement('div');
    body.classList.add('Chatpopup-body');
    popup.appendChild(body);
    
    container.appendChild(popup);
    
    const headerText = title.toLowerCase();
    
    if (headerText.includes("papaya")) {
        header.style.background = "#8B0000";
        header.style.color = "#FFFFFF";
    } else if (headerText.includes("apple")) {
        header.style.background = "#00008B";
        header.style.color = "#FFFFFF";
    } else if (headerText.includes("mango")) {
        header.style.background = "#5C4033";
        header.style.color = "#FFFFFF";
    }
    
    makeDraggable(popup);
}

function makeDraggable(popup) {
    let offsetX, offsetY;
    let isDragging = false;
    let draggedToEdge = false; // Track if popup was dragged to create tag
    
    popup.addEventListener('mousedown', (e) => {
        // only start drag if not clicking the close button
        if (e.target.closest('.popup-close')) return;
        isDragging = true;
        draggedToEdge = false;
        offsetX = e.clientX - popup.offsetLeft;
        offsetY = e.clientY - popup.offsetTop;
        popup.style.zIndex = 1000;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        
        const rect = container.getBoundingClientRect();
        const pRect = popup.getBoundingClientRect();
        
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        
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
                popup.closedByTag = false; // Dragged to edge, not closed by tag
                saveState(); // Save after creating tag
            }
        }
        
        const titleEl = popup.querySelector('.popup-title');
        const titleText = titleEl ? titleEl.innerText : '';
        
        // manage secondary tag visuals (left/right/top/bottom)
        if (x <= 0) {
            if (!popup.secondaryTag) {
                popup.secondaryTag = createSecondaryTag(popup, "right");
            }
            const pRect = popup.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            popup.secondaryTag.style.top = pRect.top - containerRect.top + "px";
            popup.secondaryTag.style.left = pRect.right - containerRect.left + "px";
        } else if (x + pRect.width >= rect.width) {
            if (!popup.secondaryTag) {
                popup.secondaryTag = createSecondaryTag(popup, "left");
            }
            const pRect = popup.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            popup.secondaryTag.style.top = pRect.top - containerRect.top + "px";
            popup.secondaryTag.style.left = (pRect.left - containerRect.left - popup.secondaryTag.offsetWidth) + "px";
        } else if (y <= 0) {
            if (!popup.secondaryTag) {
                popup.secondaryTag = createSecondaryTag(popup, "bottom");
            }
            const pRect = popup.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            popup.secondaryTag.style.left = pRect.left - containerRect.left + "px";
            popup.secondaryTag.style.top = pRect.bottom - containerRect.top + "px";
        } else {
            if (popup.secondaryTag) {
                popup.secondaryTag.remove();
                popup.secondaryTag = null;
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            saveState(); // Save after dragging ends
        }
    });
}

function createTag(popup, top, bottom, left, right) {
    const GAP = 5;
    const titleEl = popup.querySelector('.popup-title');
    const title = titleEl ? titleEl.innerText : popup.querySelector('.Chatpopup-header')?.innerText || '';
    const tag = document.createElement('div');
    tag.classList.add('border-tag');
    
    let text = title;
    if (left || right) {
        text = [...title].join("\n");
        tag.style.whiteSpace = "pre-line";
        tag.style.textAlign = "center";
    }
    
    // Create close button for tag
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '2px';
    closeBtn.style.right = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.fontWeight = 'bold';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0 2px';
    closeBtn.style.color = 'inherit';
    closeBtn.style.zIndex = '10';
    closeBtn.style.background = 'rgba(0,0,0,0.1)';
    closeBtn.style.borderRadius = '2px';
    closeBtn.title = 'Close';
    
    tag.innerHTML = text;
    tag.appendChild(closeBtn);
    tag.setAttribute('data-original-text', title);
    tag.style.position = "absolute";
    tag.style.padding = "4px 20px 4px 6px"; // More padding on right for close button
    tag.style.cursor = "pointer";
    tag.style.fontSize = "12px";
    
    const headerText = title.toLowerCase();
    if (headerText.includes("papaya")) {
        tag.style.background = "#8B0000";
        tag.style.color = "#FFFFFF";
    } else if (headerText.includes("apple")) {
        tag.style.background = "#00008B";
        tag.style.color = "#FFFFFF";
    } else if (headerText.includes("mango")) {
        tag.style.background = "#5C4033";
        tag.style.color = "#FFFFFF";
    } else {
        tag.style.background = "#444";
        tag.style.color = "#fff";
    }
    
    const rect = container.getBoundingClientRect();
    const sortButton = document.getElementById('Sorttagsbutton');
    const sortRect = sortButton.getBoundingClientRect();
    
    let x = popup.offsetLeft;
    let y = popup.offsetTop;
    
    if (top) {
        tag.style.top = "0px";
        tag.style.left = Math.max(x, 50) + "px";
    } else if (bottom) {
        tag.style.bottom = "0px";
        tag.style.left = x + "px";
    } else if (left) {
        tag.style.left = "0px";
        tag.style.top = Math.max(y, 30) + "px";
    } else if (right) {
        tag.style.right = "0px";
        tag.style.top = y + "px";
    }
    
    container.appendChild(tag);
    
    // Close button click handler - hide tag and popup, mark as closed by tag
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tag click event
        tag.style.display = "none"; // Hide the tag
        popup.style.display = "none";
        popup.closedByTag = true; // Mark as closed by tag close button
        saveState();
    });
    
    const tags = Array.from(container.querySelectorAll('.border-tag'))
        .filter(t => t !== tag);
    
    let moved = true;
    while (moved) {
        moved = false;
        const tRect = tag.getBoundingClientRect();
        
        for (let other of tags) {
            const oRect = other.getBoundingClientRect();
            const overlap =
                !(tRect.right + GAP < oRect.left ||
                tRect.left - GAP > oRect.right ||
                tRect.bottom + GAP < oRect.top ||
                tRect.top - GAP > oRect.bottom);
            
            const overlapSort =
                !(tRect.right + GAP < sortRect.left ||
                tRect.left - GAP > sortRect.right ||
                tRect.bottom + GAP < sortRect.top ||
                tRect.top - GAP > sortRect.bottom);
            
            if (overlap || overlapSort) {
                moved = true;
                if (top || bottom) {
                    tag.style.left = (parseFloat(tag.style.left) + GAP) + "px";
                }
                if (left || right) {
                    tag.style.top = (parseFloat(tag.style.top) + GAP) + "px";
                }
                break;
            }
        }
    }
    
    tag.addEventListener('click', () => {
        tag.remove();
        popup.style.display = "block";
        popup.closedByTag = false; // Reset when restored by clicking tag
        const rect = container.getBoundingClientRect();
        const pRectNow = popup.getBoundingClientRect();
        const GAP = 10;
        
        const visiblePopups = Array.from(container.querySelectorAll('.Chatpopup'))
            .filter(p => p !== popup && p.style.display !== 'none');
        
        let newLeft = 40;
        let newTop = 30;
        let safe = false;
        
        while (!safe) {
            safe = true;
            for (let other of visiblePopups) {
                const oRect = other.getBoundingClientRect();
                const overlap =
                    !(newLeft + pRectNow.width <= oRect.left ||
                    newLeft >= oRect.right ||
                    newTop + pRectNow.height <= oRect.top ||
                    newTop >= oRect.bottom);
                
                if (overlap) {
                    newLeft += GAP;
                    safe = false;
                    break;
                }
            }
            if (newLeft + pRectNow.width > rect.width) newLeft = 10;
            if (newTop + pRectNow.height > rect.height) newTop = 10;
        }
        
        popup.style.left = newLeft + "px";
        popup.style.top = newTop + "px";
        saveState(); // Save after restoring popup
    });
}

function autoSortTags() {
    const container = document.querySelector('.chatWrapper');
    const rect = container.getBoundingClientRect();

    const GAP = 5;
    const START_OFFSET = 55;

    function getTagText(tag) {
        return (
            tag.dataset.popupTitle ||
            tag.dataset.originalText ||
            tag.innerText
        )
            .replace(/\n/g, '')
            .replace('×', '')
            .trim();
    }

    /* --------------------------------------------------
       STEP 1: Collect PRIMARY tag titles
    -------------------------------------------------- */
    const primaryTitles = new Set(
        Array.from(container.querySelectorAll('.border-tag'))
            .filter(t => t.style.display !== 'none')
            .map(t => getTagText(t))
    );

    /* --------------------------------------------------
       STEP 2: Collect tags but REMOVE secondary
               if primary exists
    -------------------------------------------------- */
    const tags = Array.from(
        container.querySelectorAll('.border-tag, .secondary-tag')
    )
        .filter(tag => {
            if (tag.style.display === 'none') return false;

            const title = getTagText(tag);

           
            if (
                tag.classList.contains('secondary-tag') &&
                primaryTitles.has(title)
            ) {
                tag.remove(); // optional but recommended
                return false;
            }

            return true;
        })
        .sort((a, b) => getTagText(a).localeCompare(getTagText(b)));

    let pos = {
        top: START_OFFSET,
        right: START_OFFSET,
        bottom: START_OFFSET,
        left: START_OFFSET
    };

    /* --------------------------------------------------
       STEP 3: Normal sorting logic (unchanged)
    -------------------------------------------------- */
    tags.forEach(tag => {
        const text = getTagText(tag);
        const isSecondary = tag.classList.contains('secondary-tag');
        
        // Store side information for secondary tags
        let side = null;
        if (isSecondary) {
            if (tag.style.left && parseFloat(tag.style.left) <= 10) side = 'left';
            else if (tag.style.right && parseFloat(tag.style.right) <= 10) side = 'right';
            else if (tag.style.top && parseFloat(tag.style.top) <= 10) side = 'top';
            else if (tag.style.bottom && parseFloat(tag.style.bottom) <= 10) side = 'bottom';
        }
        tag.dataset.side = side || '';

        if (!tag.dataset.originalText) {
            tag.dataset.originalText = text;
        }

        // Remove old close button if it exists
        const oldCloseBtn = tag.querySelector('span');
        if (oldCloseBtn) oldCloseBtn.remove();

        tag.innerHTML = '';
        tag.style.whiteSpace = 'nowrap';
        tag.style.textAlign = 'center';

        tag.innerHTML =
            isSecondary &&
            (tag.dataset.side === 'left' || tag.dataset.side === 'right')
                ? [...text].join('\n')
                : text;

        /* close button */
        const closeBtn = document.createElement('span');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position:absolute;
            top:2px;
            right:4px;
            cursor:pointer;
            font-size:16px;
            font-weight:bold;
            line-height:1;
            padding:0 2px;
            background:rgba(0,0,0,.1);
            border-radius:2px;
            z-index:10;
        `;
        tag.appendChild(closeBtn);

        const popup = Array.from(
            container.querySelectorAll('.Chatpopup')
        ).find(p =>
            p.querySelector('.popup-title')?.innerText.trim() === text
        );

        closeBtn.onclick = e => {
            e.stopPropagation();
            tag.style.display = 'none';
            if (popup) popup.style.display = 'none';
            saveState();
        };

        // ✅ If secondary tag is sorted → hide related popup
        if (isSecondary && popup) {
            popup.style.display = 'none';
            popup.closedByTag = true;
            popup.secondaryTag = tag; // Link popup to the sorted secondary tag
            popup.secondaryTagSide = tag.dataset.side;

            // Add click handler for secondary tag
            tag.onclick = () => {
                popup.style.display = 'block';
                popup.closedByTag = false;
                
                // Remove the sorted secondary tag
                tag.remove();
                
                // Clear any existing secondary tag reference
                if (popup.secondaryTag && popup.secondaryTag !== tag) {
                    popup.secondaryTag.remove();
                }
                popup.secondaryTag = null;
                popup.secondaryTagSide = null;
                
                // Only recreate secondary tag if popup is at border
                const rect = container.getBoundingClientRect();
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
        }



        /* ---------- CLOCKWISE PLACEMENT ---------- */

        // TOP
        if (pos.top + tag.offsetWidth <= rect.width - START_OFFSET) {
            tag.style.top = '1px';
            tag.style.left = pos.top + 'px';
            tag.style.right = tag.style.bottom = '';
            pos.top += tag.offsetWidth + GAP;
            return;
        }

        // RIGHT
        tag.innerHTML = [...text].join('\n');
        tag.appendChild(closeBtn);
        tag.style.whiteSpace = 'pre-line';

        if (pos.right + tag.offsetHeight <= rect.height - START_OFFSET) {
            tag.style.right = GAP + 'px';
            tag.style.top = pos.right + 'px';
            tag.style.left = tag.style.bottom = '';
            pos.right += tag.offsetHeight + GAP;
            return;
        }

        // BOTTOM
        tag.innerHTML = text;
        tag.appendChild(closeBtn);
        tag.style.whiteSpace = 'nowrap';

        if (pos.bottom + tag.offsetWidth <= rect.width - START_OFFSET) {
            tag.style.bottom = GAP + 'px';
            tag.style.left = pos.bottom + 'px';
            tag.style.top = tag.style.right = '';
            pos.bottom += tag.offsetWidth + GAP;
            return;
        }

        // LEFT
        tag.innerHTML = [...text].join('\n');
        tag.appendChild(closeBtn);
        tag.style.whiteSpace = 'pre-line';

        if (pos.left + tag.offsetHeight <= rect.height - START_OFFSET) {
            tag.style.left = GAP + 'px';
            tag.style.top = pos.left + 'px';
            tag.style.right = tag.style.bottom = '';
            pos.left += tag.offsetHeight + GAP;
        }
    });
}


setInterval(() => {
    autoSortTags();
}, 180000);

// Optional: Add a clear state function for debugging
function clearSavedState() {
    localStorage.removeItem('chatPopupState');
    console.log('Saved state cleared');
}


// Add this code after your other window event listeners

// Handle window resize to keep popups and tags within bounds
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        repositionPopupsOnResize();
        repositionTagsOnResize();
        saveState();
    }, 100); // Debounce resize events
});

function repositionPopupsOnResize() {
    const rect = container.getBoundingClientRect();
    const popups = Array.from(container.querySelectorAll('.Chatpopup'));
    
    popups.forEach(popup => {
        if (popup.style.display === 'none') return;
        
        const pRect = popup.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        let left = popup.offsetLeft;
        let top = popup.offsetTop;
        let needsRepositioning = false;
        
        // Keep popup within right boundary
        if (left + pRect.width > rect.width) {
            left = Math.max(0, rect.width - pRect.width);
            popup.style.left = left + 'px';
            needsRepositioning = true;
        }
        
        // Keep popup within bottom boundary
        if (top + pRect.height > rect.height) {
            top = Math.max(0, rect.height - pRect.height);
            popup.style.top = top + 'px';
            needsRepositioning = true;
        }
        
        // After repositioning, check if popup is now at a border and needs secondary tag
        const updatedPRect = popup.getBoundingClientRect();
        const isAtLeftBorder = popup.offsetLeft <= 0;
        const isAtRightBorder = popup.offsetLeft + updatedPRect.width >= rect.width;
        const isAtTopBorder = popup.offsetTop <= 0;
        const isAtBottomBorder = popup.offsetTop + updatedPRect.height >= rect.height;
        
        // Check if there's a primary tag for this popup
        const titleEl = popup.querySelector('.popup-title');
        const title = titleEl ? titleEl.innerText : '';
        const hasPrimaryTag = Array.from(container.querySelectorAll('.border-tag'))
            .some(tag => {
                const tagText = tag.getAttribute('data-original-text') || tag.innerText.replace(/\n/g, '').replace('×', '');
                return tagText === title && tag.style.display !== 'none';
            });
        
        // Only manage secondary tags if NO primary tag exists
        if (!hasPrimaryTag) {
            // Remove existing secondary tag if popup moved away from all borders
            if (!isAtLeftBorder && !isAtRightBorder && !isAtTopBorder && !isAtBottomBorder) {
                if (popup.secondaryTag) {
                    popup.secondaryTag.remove();
                    popup.secondaryTag = null;
                    popup.secondaryTagSide = null;
                }
            } else {
                // Popup is at a border - create or update secondary tag
                let newSide = null;
                
                if (isAtLeftBorder) newSide = "right";
                else if (isAtRightBorder) newSide = "left";
                else if (isAtTopBorder) newSide = "bottom";
                else if (isAtBottomBorder) newSide = "top";
                
                // If side changed or no secondary tag exists, recreate it
                if (newSide && (!popup.secondaryTag || popup.secondaryTagSide !== newSide)) {
                    if (popup.secondaryTag) {
                        popup.secondaryTag.remove();
                    }
                    popup.secondaryTag = createSecondaryTag(popup, newSide);
                    popup.secondaryTagSide = newSide;
                }
                
                // Update secondary tag position
                if (popup.secondaryTag) {
                    if (popup.secondaryTagSide === "right") {
                        popup.secondaryTag.style.top = (updatedPRect.top - containerRect.top) + "px";
                        popup.secondaryTag.style.left = (updatedPRect.right - containerRect.left) + "px";
                    } else if (popup.secondaryTagSide === "left") {
                        popup.secondaryTag.style.top = (updatedPRect.top - containerRect.top) + "px";
                        popup.secondaryTag.style.left = (updatedPRect.left - containerRect.left - popup.secondaryTag.offsetWidth) + "px";
                    } else if (popup.secondaryTagSide === "bottom") {
                        popup.secondaryTag.style.left = (updatedPRect.left - containerRect.left) + "px";
                        popup.secondaryTag.style.top = (updatedPRect.bottom - containerRect.top) + "px";
                    } else if (popup.secondaryTagSide === "top") {
                        popup.secondaryTag.style.left = (updatedPRect.left - containerRect.left) + "px";
                        popup.secondaryTag.style.top = (updatedPRect.top - containerRect.top - popup.secondaryTag.offsetHeight) + "px";
                    }
                }
            }
        } else {
            // Primary tag exists - remove any secondary tag
            if (popup.secondaryTag) {
                popup.secondaryTag.remove();
                popup.secondaryTag = null;
                popup.secondaryTagSide = null;
            }
        }
    });
}

function repositionTagsOnResize() {
    const rect = container.getBoundingClientRect();
    const tags = Array.from(container.querySelectorAll('.border-tag'))
        .filter(tag => tag.style.display !== 'none');
    
    tags.forEach(tag => {
        const tRect = tag.getBoundingClientRect();
        
        // For tags positioned on top
        if (tag.style.top === "1px" || tag.style.top === "0px") {
            let left = parseFloat(tag.style.left);
            if (left + tRect.width > rect.width) {
                tag.style.left = Math.max(0, rect.width - tRect.width) + "px";
            }
        }
        
        // For tags positioned on bottom
        if (tag.style.bottom && tag.style.bottom !== "") {
            let left = parseFloat(tag.style.left);
            if (left + tRect.width > rect.width) {
                tag.style.left = Math.max(0, rect.width - tRect.width) + "px";
            }
        }
        
        // For tags positioned on right
        if (tag.style.right && tag.style.right !== "" && tag.style.right !== "0px") {
            let top = parseFloat(tag.style.top);
            if (top + tRect.height > rect.height) {
                tag.style.top = Math.max(0, rect.height - tRect.height) + "px";
            }
        }
        
        // For tags positioned on left
        if (tag.style.left === "3px" || (tag.style.left && parseFloat(tag.style.left) < 10)) {
            let top = parseFloat(tag.style.top);
            if (top + tRect.height > rect.height) {
                tag.style.top = Math.max(0, rect.height - tRect.height) + "px";
            }
        }
    });
}