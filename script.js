let Data = {
    numberStats: {},
    cooccurrence: {}
};

// Initialize 1~49
for (let i = 1; i <= 49; i++) {
    Data.numberStats[i] = { appearances: 0, mainNumber: 0, lastSeen: "1970-01-01" };
    Data.cooccurrence[i] = {};
    for (let j = 1; j <= 49; j++) {
        Data.cooccurrence[i][j] = 0;
    }
}

// Load CSV data
d3.csv("Mark_Six.csv").then(data => {
    let drawCount = data.length;
    data.forEach(draw => {
        let mainNums = [
            +draw['Winning Number 1'],
            +draw['2'],
            +draw['3'],
            +draw['4'],
            +draw['5'],
            +draw['6']
        ];
        let extraNum = +draw['Extra Number'] || 0;
        let currentDate = draw.Date;

        // Main number statistics
        mainNums.forEach(n => {
            Data.numberStats[n].mainNumber++;
            Data.numberStats[n].appearances++;
            if (currentDate > Data.numberStats[n].lastSeen) {
                Data.numberStats[n].lastSeen = currentDate;
            }
        });

        // extra number statistics
        if (extraNum >= 1 && extraNum <= 49) {
            Data.numberStats[extraNum].appearances++;
            if (currentDate > Data.numberStats[extraNum].lastSeen) {
                Data.numberStats[extraNum].lastSeen = currentDate;
            }
        }

        // Co-occurrence
        for (let i = 0; i < 6; i++) {
            for (let j = i + 1; j < 6; j++) {
                let a = mainNums[i];
                let b = mainNums[j];
                Data.cooccurrence[a][b]++;
                Data.cooccurrence[b][a]++;
            }
        }
    });
});

// Co-occurring color configuration (low white, high red)
const colorScale = d3.scaleQuantize()
    .domain([0, 100])
    .range(["#ffffff", "#ffcccc", "#ff9999", "#ff6666", "#ff0000"]);

let selectedNumbers = new Set();
const maxSelections = 6;

// Number ball color
function getMarkSixColor(num) {
    const red = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
    const blue = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];
    const green = [5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49];
    if (red.includes(num)) return "#ff3131";
    if (blue.includes(num)) return "#0070ff";
    return "#28a745";
}

// Generate Numbered Balls (Preserving Image Style) 
const grid = document.getElementById("number-grid");
for (let i = 1; i <= 49; i++) {
    const ball = document.createElement('div');
    ball.className = 'num-ball';
    ball.style.borderColor = getMarkSixColor(i);

    const img = document.createElement('div');
    img.className = 'ball-img';
    img.style.backgroundImage = `url('images/ball-${i}.svg')`;

    const text = document.createElement('span');
    text.className = 'num-text';
    text.innerText = i;

    ball.appendChild(img);
    ball.appendChild(text);

    ball.onmouseenter = () => {
        if (!ball.classList.contains('selected')) {
            text.style.color = getMarkSixColor(i);
        }
    };

    ball.onmouseleave = () => {
        if (!ball.classList.contains('selected')) {
            text.style.color = '';
        }
    };

    // Click to select
    ball.onclick = () => {
        const num = i;
        const isSelected = ball.classList.contains('selected');

        if (isSelected) {
            selectedNumbers.delete(num);
            ball.classList.remove('selected');
            text.style.display = 'flex';
        } else {
            if (selectedNumbers.size >= maxSelections) {
                alert("You can only choose a maximum of 6 numbers!");
                return;
            }
            selectedNumbers.add(num);
            ball.classList.add('selected');
            text.style.display = 'none';
        }

        // Refresh co-occurrence colors + statistics
        updateNumberVisualization();
        updateAllStats();
    };

    grid.appendChild(ball);
}

//  Co-occurrence Color Changing 
function updateNumberVisualization() {
    const selectedArr = Array.from(selectedNumbers);
    const isSingle = selectedArr.length === 1;

    document.querySelectorAll('.num-ball').forEach(ball => {
        const num = parseInt(ball.querySelector('.num-text').innerText);
        if (selectedNumbers.has(num)) return;

        let score = 0;

        if (isSingle) {
            const s = selectedArr[0];
            score = Data.cooccurrence[s][num];
        } else {
            const testCombo = [...selectedArr, num].sort((a, b) => a - b);
            score = countComboAppearance(testCombo);
        }

        ball.style.backgroundColor = colorScale(score);
    });
}

// Dynamically updated legend
function updateLegend() {
    const legend = document.getElementById("dynamicLegend");
    legend.innerHTML = "";

    const range = colorScale.range();
    // Calculate the segmented threshold of scaleQuantize
    const thresholds = colorScale.thresholds();

    // Generate tags for each segment
    range.forEach((color, i) => {
        let start, end;
        if (i === 0) {
            start = colorScale.domain()[0];
            end = thresholds[0];
        } else if (i === range.length - 1) {
            start = thresholds[thresholds.length - 1];
            end = colorScale.domain()[1];
        } else {
            start = thresholds[i - 1];
            end = thresholds[i];
        }

        const item = document.createElement("div");
        item.className = "legend-item";
        item.innerHTML = `
            <span class="legend-color" style="background-color: ${color}; ${color === '#ffffff' ? 'border:1px solid #ddd;' : ''}"></span>
            <span class="legend-text">${start}-${end} ${i === 0 ? '(Low)' : i === range.length-1 ? '(High)' : ''}</span>
        `;
        legend.appendChild(item);
    });
}

// Number of times the combination appears
function countComboAppearance(combo) {
    let count = 0;
    d3.csv("Mark_Six.csv").then(draws => {
        draws.forEach(draw => {
            const nums = [
                +draw['Winning Number 1'], 
                +draw['2'], 
                +draw['3'],
                +draw['4'], 
                +draw['5'], 
                +draw['6']
            ];
            const containsAll = combo.every(n => nums.includes(n));
            if (containsAll) count++;
        });
    });
    return count;
}

// Statistical Area Update 
function updateAllStats() {
    const container = document.getElementById("statsContainer");
    const emptyState = document.getElementById("emptyState");
    const rightPanel = document.querySelector(".right");
    
    if (selectedNumbers.size === 0) {
        container.style.display = "none";
        emptyState.style.display = "block";
        rightPanel.classList.remove("active");
        return;
    }
    
    container.style.display = "block";
    emptyState.style.display = "none";
    rightPanel.classList.add("active");

    const sorted = Array.from(selectedNumbers).sort((a, b) => a - b);
    d3.select("#statsIcons").html("");

    sorted.forEach(n => {
        d3.select("#statsIcons")
            .append("div")
            .attr("class", "stats-icon")
            .style("background-color", "transparent")
            .style("background-image", `url('images/ball-${n}.svg')`)
            .style("background-size", "cover")
            .style("background-position", "center")
            .style("width", "80px")
            .style("height", "80px")
            .style("border-radius", "50%")
            .style("margin-right", "4px")
            .text("");
    });

    d3.select("#selectedNumbersText").text(sorted.join(", "));

    if (selectedNumbers.size === 1) {
        updateStatsCard(sorted[0]);
    } else {
        getCombinationStats(sorted);
    }

    renderCompanionChart(sorted);

    updateLegend();
}

// Single number statistics
function updateStatsCard(num) {
    const stats = Data.numberStats[num];
    d3.select("#appearances").text(stats.appearances);
    d3.select("#frequency").text(((stats.appearances / 2522) * 100).toFixed(2) + "%");
    d3.select("#mainNumber").text(stats.mainNumber);
    d3.select("#lastSeen").text(stats.lastSeen);
}

// Combinatorial statistics
function getCombinationStats(sortedNumbers) {
    d3.csv("Mark_Six.csv").then(draws => {
        let comboCount = 0;
        let mainComboCount = 0;
        let lastDrawDate = "N/A";

        draws.forEach(draw => {
            const main = [
                +draw['Winning Number 1'], 
                +draw['2'], 
                +draw['3'],
                +draw['4'], 
                +draw['5'], 
                +draw['6']
            ];
            const extra = +draw['Extra Number'] || 0;
            const all = [...main, extra];
            const date = draw.Date;

            const inAll = sortedNumbers.every(n => all.includes(n));
            if (inAll) {
                comboCount++;
                if (lastDrawDate === "N/A" || date > lastDrawDate) {
                    lastDrawDate = date;
                }
            }

            const inMain = sortedNumbers.every(n => main.includes(n));
            if (inMain) mainComboCount++;
        });

        d3.select("#appearances").text(comboCount);
        d3.select("#frequency").text(((comboCount / draws.length) * 100).toFixed(2) + "%");
        d3.select("#mainNumber").text(mainComboCount);
        d3.select("#lastSeen").text(lastDrawDate);
    });
}


// Co-occurrence bar chart
async function renderCompanionChart(selectedList) {
    const chartWrapper = document.getElementById("chartWrapper");
    const chartContainer = document.getElementById("companionChart");

    chartWrapper.style.display = "block";
    chartContainer.innerHTML = "";

    // Load data
    const draws = await d3.csv("Mark_Six.csv");

    const result = [];

    // For each unselected number n
    for (let n = 1; n <= 49; n++) {
        if (selectedList.includes(n)) continue;

        // Combination = All numbers you selected + n
        const combo = [...selectedList, n].sort((a, b) => a - b);

        // Calculate how many times this set of numbers actually appeared together
        let count = 0;
        for (const draw of draws) {
            const nums = [
                +draw['Winning Number 1'],
                +draw['2'],
                +draw['3'],
                +draw['4'],
                +draw['5'],
                +draw['6']
            ];

            // Check that every single one in the combo is in the winning numbers.
            const allIn = combo.every(x => nums.includes(x));
            if (allIn) count++;
        }

        result.push({ number: n, count: count });
    }

    // Take the top 10 with the most occurrences
    const top10 = result
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Drawing chart
    const margin = { top: 15, right: 20, bottom: 45, left: 40 };
    const width = chartContainer.clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = d3.select(chartContainer)
        .append("svg")
        .attr("width", width)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleBand()
        .domain(top10.map(d => d.number))
        .range([0, width - margin.left - margin.right])
        .padding(0.2);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    const maxY = d3.max(top10, d => d.count) || 1;

    const y = d3.scaleLinear()
        .domain([0, maxY])
        .range([height, 0]);

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.selectAll("rect")
        .data(top10)
        .enter()
        .append("rect")
        .attr("fill", "#9333ea")
        .attr("x", d => x(d.number))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count));

    // X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#4a5568")
        .text("Companion Number");

    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#4a5568")
        .text("Co-occurrence Count");
}

// Pop-up control
const modalOverlay = document.getElementById("modalOverlay");
const infoBtn = document.getElementById("infoBtn");
const closeModal = document.getElementById("closeModal");

infoBtn.addEventListener("click", () => {
    modalOverlay.style.display = "flex";
});

closeModal.addEventListener("click", () => {
    modalOverlay.style.display = "none";
});

// Can also turn it off by clicking the background.
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.style.display = "none";
    }
});
