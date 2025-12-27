// Roulette table interaction handler
class RouletteTable {
    constructor() {
        this.selectedBets = [];
        this.selectedChipValue = null;
        this.betAmounts = new Map(); // Track bet amounts per cell
        this.individualChips = new Map(); // Track individual chips per cell [{value, id}, ...]
        this.chipCounter = 0; // Counter for unique chip IDs
        this.init();
    }

    init() {
        // Add click listeners to all bet cells
        const betCells = document.querySelectorAll('.bet-cell');
        betCells.forEach(cell => {
            cell.addEventListener('click', (e) => this.handleCellClick(e));
        });

        // Add click listeners to chips
        const chips = document.querySelectorAll('.chip');
        chips.forEach(chip => {
            chip.addEventListener('click', (e) => this.handleChipClick(e));
        });

        // Add click listener to spin button
        const spinButton = document.getElementById('spin-button');
        if (spinButton) {
            spinButton.addEventListener('click', () => this.handleSpin());
        }

        this.updateTotalBet();
    }

    handleChipClick(event) {
        const chip = event.currentTarget;
        const value = parseInt(chip.dataset.value);
        
        // Remove selection from all chips
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        
        // Toggle selection
        if (this.selectedChipValue === value) {
            this.selectedChipValue = null;
        } else {
            this.selectedChipValue = value;
            chip.classList.add('selected');
        }
        
        this.updateTotalBet();
    }

    handleCellClick(event) {
        const cell = event.currentTarget;
        
        // If a chip is selected, add bet to this cell
        if (this.selectedChipValue) {
            this.addBetToCell(cell, this.selectedChipValue);
        } else {
            // If no chip selected and cell has a bet, remove the bet
            if (this.betAmounts.has(this.getCellId(cell))) {
                this.removeBetFromCell(cell);
            } else {
                // Old behavior: toggle selection
                const isSelected = cell.classList.contains('selected');
                
                if (isSelected) {
                    this.deselectCell(cell);
                } else {
                    this.selectCell(cell);
                }
            }
        }
        
        this.updateDisplay();
    }

    removeBetFromCell(cell) {
        const cellId = this.getCellId(cell);
        
        // Remove bet completely
        this.betAmounts.delete(cellId);
        this.individualChips.delete(cellId);
        cell.classList.remove('has-bet');
        
        // Remove all chips
        const existingChips = cell.querySelectorAll('.bet-chip');
        existingChips.forEach(chip => chip.remove());
        
        // Remove from selected bets
        const betInfo = this.getBetInfo(cell);
        this.selectedBets = this.selectedBets.filter(bet => bet.id !== betInfo.id);
        
        // Update total bet immediately
        this.updateTotalBet();
    }

    addBetToCell(cell, chipValue) {
        const cellId = this.getCellId(cell);
        
        // Get current bet amount for this cell
        const currentAmount = this.betAmounts.get(cellId) || 0;
        const newAmount = currentAmount + chipValue;
        
        // Get current individual chips for this cell
        let chips = this.individualChips.get(cellId) || [];
        
        // Add new chip
        chips.push({
            value: chipValue,
            id: `chip-${this.chipCounter++}`
        });
        
        // Check for consolidation thresholds
        const consolidated = this.consolidateChips(chips, newAmount);
        
        // Update stored chips and amount
        this.individualChips.set(cellId, consolidated.chips);
        this.betAmounts.set(cellId, consolidated.total);
        
        // Mark cell as having bets
        cell.classList.add('has-bet');
        
        // Add or update bet info
        const betInfo = this.getBetInfo(cell);
        const existingBetIndex = this.selectedBets.findIndex(bet => bet.id === betInfo.id);
        
        if (existingBetIndex >= 0) {
            this.selectedBets[existingBetIndex].amount = consolidated.total;
        } else {
            betInfo.amount = consolidated.total;
            this.selectedBets.push(betInfo);
        }
        
        // Display chips on cell
        this.displayChipsOnCell(cell, consolidated.chips, consolidated.total);
        
        // Update total bet immediately
        this.updateTotalBet();
    }

    consolidateChips(chips, totalAmount) {
        // Don't consolidate in data structure - keep all individual chips
        // Consolidation will happen only in display
        return {
            chips: chips,
            total: totalAmount
        };
    }

    getCellId(cell) {
        const number = cell.dataset.number;
        const betType = cell.dataset.bet;
        
        if (number !== undefined) {
            return `number-${number}`;
        } else if (betType) {
            return `bet-${betType}`;
        }
        return `cell-${Math.random()}`;
    }

    displayChipsOnCell(cell, chips, totalAmount) {
        // Remove all existing chips
        const existingChips = cell.querySelectorAll('.bet-chip');
        existingChips.forEach(chip => chip.remove());
        
        // Determine if we should show a plate and calculate remainder
        let plateValue = 0;
        let remainder = totalAmount;
        let displayChips = [];
        
        if (totalAmount >= 10000) {
            // Show 10k plate and remainder as chips
            plateValue = 10000;
            remainder = totalAmount - 10000;
        } else if (totalAmount >= 5000) {
            // Show 5k plate and remainder as chips
            plateValue = 5000;
            remainder = totalAmount - 5000;
        }
        
        // If we have a plate, add it first
        if (plateValue > 0) {
            displayChips.push({
                value: plateValue,
                id: `plate-${plateValue}`,
                isPlate: true
            });
        }
        
        // Add all individual chips (they represent the full amount, but we'll display them as remainder)
        // For amounts above threshold, we show the plate + individual chips
        if (remainder > 0) {
            // Break down remainder into chip values
            const chipValues = [1000, 500, 100, 50, 25, 10, 5, 1];
            let remaining = remainder;
            
            for (let chipVal of chipValues) {
                while (remaining >= chipVal) {
                    displayChips.push({
                        value: chipVal,
                        id: `remainder-${this.chipCounter++}`
                    });
                    remaining -= chipVal;
                }
            }
        } else if (plateValue === 0) {
            // No plate, show all individual chips
            displayChips = chips.map(chip => ({ ...chip }));
        }
        
        // Display all chips (plates and regular chips)
        displayChips.forEach((chip, index) => {
            const chipDisplay = this.createChipElement(chip.value, chip.value);
            
            // Offset chips slightly for visual stacking
            const offsetX = (index % 3) * 5 - 5; // -5, 0, 5
            const offsetY = Math.floor(index / 3) * 5 - 5; // -5, 0, 5
            chipDisplay.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
            chipDisplay.style.zIndex = (10 + index).toString();
            
            cell.appendChild(chipDisplay);
        });
    }

    createChipElement(chipValue, displayAmount) {
        const chipDisplay = document.createElement('div');
        chipDisplay.className = 'bet-chip';
        
        // Check if this is a plate (5k or 10k)
        const isPlate = chipValue === 5000 || chipValue === 10000;
        
        if (isPlate) {
            // Add plate classes and make it rectangular
            chipDisplay.classList.add('rectangular');
            if (chipValue === 5000) {
                chipDisplay.classList.add('plate-5k');
            } else if (chipValue === 10000) {
                chipDisplay.classList.add('plate-10k');
            }
            
            // Format plate display - show full number
            const displayText = `$${chipValue.toLocaleString()}`;
            chipDisplay.textContent = displayText;
        } else {
            // Regular chip - match bottom chip styling exactly
            // Format amount for display - match bottom chip format
            let displayText = `$${chipValue}`;
            chipDisplay.textContent = displayText;
        }
        
        // Determine chip color based on chip value (matching bottom chip colors exactly)
        this.applyChipColor(chipDisplay, chipValue);
        
        return chipDisplay;
    }

    applyChipColor(chipDisplay, amount) {
        // Enhanced chip styling with gradients and shadows
        // Reset to default
        chipDisplay.style.background = 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)';
        chipDisplay.style.color = '#000';
        chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.3)';
        
        // Enhanced shadow base
        const baseShadow = '0 6px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.1)';
        
        // Special colors for plates
        if (amount === 10000) {
            // Special color for 10k plate - deep gold/amber with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ff8c00 0%, #ffa500 50%, #ff8c00 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 2px 3px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(255, 140, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 200, 100, 0.2)';
        } else if (amount === 5000) {
            // Special color for 5k plate - teal/cyan with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #00ced1 0%, #20b2aa 50%, #00ced1 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 2px 3px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 206, 209, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(100, 250, 255, 0.2)';
        } else if (amount === 1000) {
            // Magenta for $1000 - matches bottom chip exactly with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ff66ff 0%, #ff00ff 50%, #cc00cc 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(255, 0, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 150, 255, 0.2)';
        } else if (amount === 500) {
            // Purple for $500 with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #cc66ff 0%, #9900cc 50%, #660099 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(153, 0, 204, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(200, 100, 255, 0.2)';
        } else if (amount === 100) {
            // Black for $100 with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #333333 0%, #000000 50%, #1a1a1a 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(255, 255, 255, 0.3)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(100, 100, 100, 0.1)';
        } else if (amount === 50) {
            // Orange for $50 with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ffcc33 0%, #ff9900 50%, #cc7700 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(255, 153, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 200, 100, 0.2)';
        } else if (amount === 25) {
            // Green for $25 with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #33ff33 0%, #00cc00 50%, #009900 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 204, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(100, 255, 100, 0.2)';
        } else if (amount === 10) {
            // Blue for $10 with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #3399ff 0%, #0066ff 50%, #0044cc 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 102, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(100, 150, 255, 0.2)';
        } else if (amount === 5) {
            // Red for $5 with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ff3333 0%, #cc0000 50%, #990000 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(204, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 100, 100, 0.2)';
        } else if (amount === 1) {
            // White for $1 with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #e8e8e8 100%)';
            chipDisplay.style.color = '#000';
            chipDisplay.style.textShadow = '0 1px 2px rgba(255, 255, 255, 0.8)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -2px 4px rgba(0, 0, 0, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.2)';
        } else if (amount >= 10000) {
            // For consolidated plates >= 10000, use deep gold with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ff8c00 0%, #ffa500 50%, #ff8c00 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 2px 3px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(255, 140, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 200, 100, 0.2)';
        } else if (amount >= 5000) {
            // For consolidated plates >= 5000 but < 10000, use teal with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #00ced1 0%, #20b2aa 50%, #00ced1 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 2px 3px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 206, 209, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(100, 250, 255, 0.2)';
        } else if (amount >= 1000) {
            // For individual chips >= 1000, use magenta (like $1000 chip) with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ff66ff 0%, #ff00ff 50%, #cc00cc 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(255, 0, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 150, 255, 0.2)';
        } else if (amount >= 500) {
            // For amounts >= 500 but < 1000, use purple with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #cc66ff 0%, #9900cc 50%, #660099 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(153, 0, 204, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(200, 100, 255, 0.2)';
        } else if (amount >= 100) {
            // For amounts >= 100 but < 500, use black with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #333333 0%, #000000 50%, #1a1a1a 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(255, 255, 255, 0.3)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(100, 100, 100, 0.1)';
        } else if (amount >= 50) {
            // For amounts >= 50 but < 100, use orange with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ffcc33 0%, #ff9900 50%, #cc7700 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(255, 153, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 200, 100, 0.2)';
        } else if (amount >= 25) {
            // For amounts >= 25 but < 50, use green with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #33ff33 0%, #00cc00 50%, #009900 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 204, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(100, 255, 100, 0.2)';
        } else if (amount >= 10) {
            // For amounts >= 10 but < 25, use blue with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #3399ff 0%, #0066ff 50%, #0044cc 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 102, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(100, 150, 255, 0.2)';
        } else if (amount >= 5) {
            // For amounts >= 5 but < 10, use red with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ff3333 0%, #cc0000 50%, #990000 100%)';
            chipDisplay.style.color = '#fff';
            chipDisplay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(204, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 100, 100, 0.2)';
        } else if (amount >= 1) {
            // For amounts >= 1 but < 5, use white with gradient
            chipDisplay.style.background = 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #e8e8e8 100%)';
            chipDisplay.style.color = '#000';
            chipDisplay.style.textShadow = '0 1px 2px rgba(255, 255, 255, 0.8)';
            chipDisplay.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -2px 4px rgba(0, 0, 0, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.2)';
        }
    }

    selectCell(cell) {
        cell.classList.add('selected');
        
        const betInfo = this.getBetInfo(cell);
        this.selectedBets.push(betInfo);
    }

    deselectCell(cell) {
        cell.classList.remove('selected');
        cell.classList.remove('has-bet');
        
        // Remove chip display
        const chipDisplay = cell.querySelector('.bet-chip');
        if (chipDisplay) {
            chipDisplay.remove();
        }
        
        // Remove bet amount
        const cellId = this.getCellId(cell);
        this.betAmounts.delete(cellId);
        
        const betInfo = this.getBetInfo(cell);
        this.selectedBets = this.selectedBets.filter(bet => 
            bet.id !== betInfo.id
        );
    }

    getBetInfo(cell) {
        const number = cell.dataset.number;
        const color = cell.dataset.color;
        const betType = cell.dataset.bet;
        
        if (number !== undefined) {
            return {
                id: `number-${number}`,
                type: 'straight',
                value: number,
                color: color,
                payout: '35:1'
            };
        } else if (betType) {
            return {
                id: `bet-${betType}`,
                type: betType,
                value: betType,
                payout: this.getPayoutForBet(betType)
            };
        }
    }

    getPayoutForBet(betType) {
        // Column bets (2:1)
        if (betType.includes('column')) return '2:1';
        
        // Dozen bets (2:1)
        if (betType.includes('12')) return '2:1';
        
        // Even money bets (1:1)
        if (['1-18', '19-36', 'even', 'odd', 'red', 'black'].includes(betType)) {
            return '1:1';
        }
        
        return 'N/A';
    }

    updateDisplay() {
        const display = document.getElementById('selection-display');
        
        // Only update if the display element exists
        if (!display) {
            this.updateTotalBet();
            return;
        }
        
        if (this.selectedBets.length === 0) {
            display.textContent = 'No selection';
            display.style.color = '#ffd700';
        } else {
            const selections = this.selectedBets.map(bet => {
                if (bet.type === 'straight') {
                    return `${bet.value} (${bet.color})`;
                } else {
                    return `${bet.value}`;
                }
            }).join(', ');
            
            display.textContent = `Selected: ${selections}`;
            display.style.color = '#4ade80';
        }
        
        this.updateTotalBet();
    }

    updateTotalBet() {
        const totalBetElement = document.getElementById('total-bet-amount');
        if (!totalBetElement) return;

        // Calculate total from all bet amounts
        let totalBet = 0;
        this.betAmounts.forEach(amount => {
            totalBet += amount;
        });

        totalBetElement.textContent = `$${totalBet.toLocaleString()}`;
    }

    handleSpin() {
        let totalBet = 0;
        this.betAmounts.forEach(amount => {
            totalBet += amount;
        });

        if (totalBet === 0) {
            return;
        }

        // Store total bet for display in "YOU LOSE" message
        this.lastTotalBet = totalBet;

        // Play roulette video overlay
        this.playRouletteVideo();

        // Clear all bets after spin
        this.clearAllSelections();

        // Spin functionality can be added here
        console.log('Spinning!', {
            bets: this.selectedBets,
            betAmounts: Array.from(this.betAmounts.entries()),
            totalBet: totalBet
        });
    }

    playRouletteVideo() {
        const videoOverlay = document.getElementById('video-overlay');
        const video = document.getElementById('roulette-video');
        
        if (videoOverlay && video) {
            // Show overlay
            videoOverlay.classList.add('active');
            
            // Close overlay when clicking on the dark background (not on video)
            const closeOverlay = (e) => {
                if (e.target === videoOverlay) {
                    video.pause();
                    videoOverlay.classList.remove('active');
                    videoOverlay.removeEventListener('click', closeOverlay);
                }
            };
            videoOverlay.addEventListener('click', closeOverlay);
            
            // Add error handler to detect video loading issues with recovery
            let errorRecoveryAttempts = 0;
            const maxRecoveryAttempts = 3;
            
            const errorHandler = (e) => {
                console.error('Video error:', e);
                if (video.error) {
                    console.error('Error code:', video.error.code);
                    console.error('Error message:', video.error.message);
                    
                    // Handle decode errors by trying to skip past the problematic frame
                    if (video.error.code === video.error.MEDIA_ERR_DECODE && errorRecoveryAttempts < maxRecoveryAttempts) {
                        errorRecoveryAttempts++;
                        const currentTime = video.currentTime;
                        const skipTime = currentTime + 0.5; // Skip 0.5 seconds ahead
                        
                        console.log(`Attempting recovery: skipping from ${currentTime} to ${skipTime}`);
                        
                        // Try to seek past the problematic frame
                        video.addEventListener('seeked', function seekHandler() {
                            video.removeEventListener('seeked', seekHandler);
                            // Try to play again after seeking
                            const playPromise = video.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(err => {
                                    console.error('Recovery play failed:', err);
                                });
                            }
                        }, { once: true });
                        
                        // Seek past the problematic frame
                        if (skipTime < video.duration) {
                            video.currentTime = skipTime;
                        } else {
                            // If we're near the end, just let it end
                            video.onended();
                        }
                        return;
                    }
                    
                    // For other errors or if recovery failed, log them
                    switch(video.error.code) {
                        case video.error.MEDIA_ERR_ABORTED:
                            console.error('Video loading aborted');
                            break;
                        case video.error.MEDIA_ERR_NETWORK:
                            console.error('Network error while loading video');
                            break;
                        case video.error.MEDIA_ERR_DECODE:
                            console.error('Error decoding video - recovery attempts exhausted');
                            // If decode error persists, try to continue anyway
                            if (video.currentTime < video.duration - 0.1) {
                                video.currentTime = video.currentTime + 0.5;
                                video.play().catch(() => {});
                            }
                            break;
                        case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            console.error('Video format not supported');
                            break;
                    }
                }
            };
            video.onerror = errorHandler;
            
            // Handle stalled video (buffering issues)
            video.onstalled = () => {
                console.log('Video stalled, attempting recovery...');
                if (video.paused && errorRecoveryAttempts < maxRecoveryAttempts) {
                    setTimeout(() => {
                        video.play().catch(() => {});
                    }, 500);
                }
            };
            
            // Add loaded event to ensure video is ready
            video.onloadeddata = () => {
                console.log('Video loaded, duration:', video.duration);
            };
            
            // Add waiting event (buffering) with recovery
            let waitingTimeout;
            video.onwaiting = () => {
                console.log('Video buffering...');
                // If video is stuck buffering, try to unstick it
                clearTimeout(waitingTimeout);
                waitingTimeout = setTimeout(() => {
                    if (video.readyState < 3) { // HAVE_FUTURE_DATA
                        console.log('Video stuck buffering, attempting recovery...');
                        const currentTime = video.currentTime;
                        // Try seeking slightly forward to trigger rebuffering
                        video.currentTime = currentTime + 0.1;
                    }
                }, 2000);
            };
            
            // Clear waiting timeout when video can play
            video.oncanplay = () => {
                clearTimeout(waitingTimeout);
            };
            
            // Add canplay event
            video.oncanplay = () => {
                console.log('Video can start playing');
            };
            
            // Add pause event listener with auto-resume on decode errors
            let pauseTimeout;
            video.onpause = () => {
                console.log('Video paused at:', video.currentTime);
                // If paused due to error and not at the end, try to resume
                if (video.error && video.error.code === video.error.MEDIA_ERR_DECODE) {
                    if (video.currentTime < video.duration - 0.5) {
                        clearTimeout(pauseTimeout);
                        pauseTimeout = setTimeout(() => {
                            // Try to skip past the problematic frame
                            const skipTime = Math.min(video.currentTime + 0.5, video.duration - 0.1);
                            video.currentTime = skipTime;
                            video.play().catch(() => {
                                console.log('Auto-resume failed, video may continue to next frame');
                            });
                        }, 200);
                    }
                }
            };
            
            // Get "YOU LOSE" text element and backdrop
            const youLoseText = document.getElementById('you-lose-text');
            const youLoseBackdrop = document.getElementById('you-lose-backdrop');
            const youLoseAmount = document.getElementById('you-lose-amount');
            
            // Reset "YOU LOSE" text, backdrop and blur when starting new video
            if (youLoseText) {
                youLoseText.classList.remove('show');
            }
            if (youLoseBackdrop) {
                youLoseBackdrop.classList.remove('show');
            }
            if (youLoseAmount) {
                youLoseAmount.textContent = '';
            }
            video.classList.remove('blurred');
            
            // Track if timers are already set
            let loseTextTimer = null;
            let closeOverlayTimer = null;
            
            // Function to show "YOU LOSE" text
            const showLoseText = () => {
                if (youLoseText) {
                    youLoseText.classList.add('show');
                    // Show backdrop with blur
                    if (youLoseBackdrop) {
                        youLoseBackdrop.classList.add('show');
                    }
                    // Add blur effect to video
                    video.classList.add('blurred');
                    // Display the lost bet amount
                    if (youLoseAmount && this.lastTotalBet) {
                        youLoseAmount.textContent = `-$${this.lastTotalBet.toLocaleString()}`;
                    }
                    console.log('YOU LOSE text shown');
                }
            };
            
            // Function to close overlay
            const closeOverlayAfterLose = () => {
                console.log('Closing overlay after YOU LOSE');
                video.pause();
                video.classList.remove('blurred');
                videoOverlay.classList.remove('active');
                videoOverlay.removeEventListener('click', closeOverlay);
                if (youLoseText) {
                    youLoseText.classList.remove('show');
                }
                if (youLoseBackdrop) {
                    youLoseBackdrop.classList.remove('show');
                }
                if (youLoseAmount) {
                    youLoseAmount.textContent = '';
                }
                // Clear timers
                if (loseTextTimer) clearTimeout(loseTextTimer);
                if (closeOverlayTimer) clearTimeout(closeOverlayTimer);
            };
            
            // Set up timers when video starts playing
            const setupLoseTimers = () => {
                // Clear any existing timers
                if (loseTextTimer) clearTimeout(loseTextTimer);
                if (closeOverlayTimer) clearTimeout(closeOverlayTimer);
                
                // Show "YOU LOSE" after 9 seconds
                loseTextTimer = setTimeout(() => {
                    showLoseText();
                }, 7500);
                
                // Close overlay after 18 seconds total (6 seconds after showing text)
                closeOverlayTimer = setTimeout(() => {
                    closeOverlayAfterLose();
                }, 18000);
            };
            
            // Add playing event - set up timers when video actually starts playing
            video.onplaying = () => {
                console.log('Video is playing');
                setupLoseTimers();
            };
            
            // Reset video to beginning
            video.currentTime = 0;
            
            // Reset error recovery attempts for this play
            errorRecoveryAttempts = 0;
            
            // Load the video to ensure it's ready
            video.load();
            
            // Wait for video to be ready, then play
            const attemptPlay = () => {
                // Only attempt to play if video is ready and not errored
                if (video.readyState >= 3 && !video.error) { // HAVE_FUTURE_DATA
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            console.log('Video playing successfully');
                        }).catch(err => {
                            console.error('Error playing video:', err);
                            // Try again after a short delay
                            setTimeout(() => {
                                if (!video.error) {
                                    video.play().catch(e => console.error('Retry play failed:', e));
                                }
                            }, 100);
                        });
                    }
                } else if (video.error) {
                    console.warn('Video has error, attempting recovery...');
                    // Error handler will attempt recovery
                }
            };
            
            // Try to play when video can play through
            const canPlayThroughHandler = () => {
                attemptPlay();
            };
            video.oncanplaythrough = canPlayThroughHandler;
            
            // Also try when video can start playing
            video.oncanplay = () => {
                // Only attempt if canplaythrough hasn't fired yet
                if (video.readyState < 4) { // Not HAVE_ENOUGH_DATA yet
                    setTimeout(attemptPlay, 100);
                }
            };
            
            // Fallback: try to play after a reasonable delay
            setTimeout(() => {
                if (video.paused && !video.error) {
                    attemptPlay();
                }
            }, 500);
            
            // Hide overlay when video ends naturally
            video.onended = () => {
                console.log('Video ended naturally');
                video.classList.remove('blurred');
                videoOverlay.classList.remove('active');
                videoOverlay.removeEventListener('click', closeOverlay);
                // Reset "YOU LOSE" text and backdrop
                if (youLoseText) {
                    youLoseText.classList.remove('show');
                }
                if (youLoseBackdrop) {
                    youLoseBackdrop.classList.remove('show');
                }
                // Clear timers
                if (loseTextTimer) clearTimeout(loseTextTimer);
                if (closeOverlayTimer) clearTimeout(closeOverlayTimer);
            };
        }
    }

    clearAllSelections() {
        const selectedCells = document.querySelectorAll('.bet-cell');
        selectedCells.forEach(cell => {
            cell.classList.remove('selected');
            cell.classList.remove('has-bet');
            const chips = cell.querySelectorAll('.bet-chip');
            chips.forEach(chip => chip.remove());
        });
        this.selectedBets = [];
        this.betAmounts.clear();
        this.individualChips.clear();
        
        // Deselect any selected chip
        document.querySelectorAll('.chip').forEach(chip => {
            chip.classList.remove('selected');
        });
        this.selectedChipValue = null;
        
        // Explicitly reset total bet label to $0
        const totalBetElement = document.getElementById('total-bet-amount');
        if (totalBetElement) {
            totalBetElement.textContent = '$0';
        }
        
        this.updateDisplay();
        this.updateTotalBet();
    }

    getSelectedBets() {
        return this.selectedBets;
    }
}

// Initialize the roulette table when page loads
let rouletteTable;

document.addEventListener('DOMContentLoaded', () => {
    rouletteTable = new RouletteTable();
    
    // Add keyboard shortcut to clear selections (ESC key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            rouletteTable.clearAllSelections();
        }
    });
    
    // Clear bet button
    const clearBetButton = document.getElementById('clear-bet-button');
    if (clearBetButton) {
        clearBetButton.addEventListener('click', () => {
            rouletteTable.clearAllSelections();
        });
    }
    
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navbarMenu = document.querySelector('.navbar-menu');
    
    if (mobileMenuToggle && navbarMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            navbarMenu.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navbarMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navbarMenu.classList.remove('active');
            }
        });
    }
    
    // Settings panel toggle
    const settingsBtn = document.querySelector('.settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    
    function openSettings() {
        if (settingsPanel && settingsOverlay) {
            settingsPanel.classList.add('active');
            settingsOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }
    
    function closeSettings() {
        if (settingsPanel && settingsOverlay) {
            settingsPanel.classList.remove('active');
            settingsOverlay.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openSettings();
        });
    }
    
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', closeSettings);
    }
    
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', closeSettings);
    }
    
    // Close settings panel when clicking outside (on overlay)
    if (settingsPanel) {
        settingsPanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Close settings panel with ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsPanel && settingsPanel.classList.contains('active')) {
            closeSettings();
        }
    });
    
    // Collapsible sections functionality
    const collapsibleHeaders = document.querySelectorAll('.settings-section-title.collapsible-header');
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.settings-section');
            if (section) {
                section.classList.toggle('collapsed');
            }
        });
    });
});

// Export for future use
window.RouletteTable = RouletteTable;

