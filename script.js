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
let colorScale;

function updateColorScale(maxCount) {
  colorScale = d3.scaleQuantize()
    .domain([0, maxCount])
    .range(["#ffffff", "#ffcccc", "#ff9999", "#ff6666", "#ff0000"]);
}

let selectedNumbers = new Set();
const maxSelections = 6;
const redNumbers = [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46];
const blueNumbers = [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48];
const greenNumbers = [5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49];

// Number ball color
function getMarkSixColor(num) {
if (redNumbers.includes(num)) return "#ff3131";
if (blueNumbers.includes(num)) return "#0070ff";
if (greenNumbers.includes(num)) return "#28a745";
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

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("ball-ring");
  svg.setAttribute("viewBox", "0 0 100 100");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "50");
  circle.setAttribute("cy", "50");
  circle.setAttribute("r", "47");
  circle.setAttribute("stroke", getMarkSixColor(i));
  circle.setAttribute("stroke-dasharray", "295 295");

  svg.appendChild(circle);
  ball.prepend(svg);

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
  ball.onclick = async () => {
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
    await updateNumberVisualization();
    updateAllStats();
  };

  grid.appendChild(ball);
}

// Probability is represented by the completeness of the outer ring of the sphere.
async function updateNumberVisualization() {
  const selectedArr = Array.from(selectedNumbers);
  const circumference = 295; // Total length of the circle

  // No number selected then restore all circles
  if (selectedArr.length === 0) {
    document.querySelectorAll('.num-ball').forEach(ball => {
      const circle = ball.querySelector('circle');
      circle.style.display = "block";
      circle.setAttribute("stroke-dasharray", `${circumference} ${circumference}`);
      ball.style.opacity = "1";
      ball.style.backgroundColor = "transparent";
    });
    return;
  }

  let scoreMap = {};
  let allScores = [];

  // Calculate the score for each number.
  for (let ball of document.querySelectorAll('.num-ball')) {
    const num = parseInt(ball.querySelector('.num-text').innerText);
    if (selectedNumbers.has(num)) continue;

    let score = 0;
    if (selectedArr.length === 1) {
      const s = selectedArr[0];
      score = Data.cooccurrence[s][num];
    } else {
      const testCombo = [...selectedArr, num].sort((a, b) => a - b);
      score = await countComboAppearance(testCombo);
    }

    scoreMap[num] = score;
    allScores.push(score);
  }

  const maxScore = Math.max(...allScores, 1);

  // Updating circle length
  document.querySelectorAll('.num-ball').forEach(ball => {
    const num = parseInt(ball.querySelector('.num-text').innerText);
    const circle = ball.querySelector('circle');
    const color = getMarkSixColor(num);

    // Selected ball: Hidden outer ring, solid color
    if (selectedNumbers.has(num)) {
      circle.style.display = "none";
      ball.style.opacity = "1";
      ball.style.backgroundColor = "transparent";
      return;
    }

    // Unselected ball: Variations in both outer ring length and transparency
    circle.style.display = "block";
    const score = scoreMap[num] || 0;
    const percent = score / maxScore;

    // Outer ring length
    const visibleLength = percent * circumference;
    circle.setAttribute("stroke-dasharray", `${visibleLength} ${circumference}`);
    circle.setAttribute("stroke", color);

    // Fading transparency: Minimum 0.2 ~ Maximum 1
    const opacity = 0.2 + (percent * 0.8);
    ball.style.opacity = opacity;

    ball.style.backgroundColor = "transparent";
  });
}

// Dynamically updated legend
function updateLegend() {
  const legend = document.getElementById("dynamicLegend");
  if(!legend) return;
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
  return new Promise(resolve => {
    d3.csv("Mark_Six.csv").then(draws => {
      let count = 0;
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
      resolve(count);
    });
  });
}

// Statistical Area Update 
async function updateAllStats() {
  const container = document.getElementById("statsContainer");
  const emptyState = document.getElementById("emptyState");
  const rightPanel = document.querySelector(".sidebar-right");
  
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
    await getCombinationStats(sorted);
  }

  await renderCompanionChart(sorted);
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
async function getCombinationStats(sortedNumbers) {
  const draws = await d3.csv("Mark_Six.csv");
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
    .append("div")
    .style("position", "relative")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const tooltip = d3.select("body").append("div")
    .attr("class", "chart-tooltip")
    .style("position", "fixed")
    .style("background", "#ffffff")
    .style("border", "1px solid #9333ea")
    .style("border-radius", "8px")
    .style("padding", "10px 14px")
    .style("box-shadow", "0 3px 10px rgba(0,0,0,0.2)")
    .style("pointer-events", "none")
    .style("z-index", "9999")
    .style("opacity", 0)
    .style("font-size", "14px");

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
    .attr("height", d => height - y(d.count))

    // Mouse hover
    .on("mouseover", function(e, d) {
      d3.select(this).attr("fill", "#c084fc");
        
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>Number ${d.number}</strong><br/>
          Co-occurrence: ${d.count} times
        `)
        .style("left", (e.clientX + 15) + "px")
        .style("top", (e.clientY - 28) + "px");
    })
      
    // Mouse leave
    .on("mouseout", function() {
      d3.select(this).attr("fill", "#9333ea");
      tooltip.style("opacity", 0);
    });

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

const resetBtn = document.getElementById("resetBtn");
resetBtn.addEventListener("click", async () => {
  // Clear selected numbers
  selectedNumbers.clear();

  // Restore all balls to an unselected state.
  document.querySelectorAll(".num-ball").forEach(ball => {
    ball.classList.remove("selected");
    ball.querySelector(".num-text").style.display = "flex";
    ball.style.backgroundColor = ""; // Clear heatmap colors
  });

  await updateNumberVisualization();
  updateAllStats();
});

// Download CSV file
document.getElementById('downloadBtn').addEventListener('click', () => {
  // File path
  const fileUrl = 'Mark_Six.csv';
  const fileName = 'Mark_Six.csv';

  // Create a temporary <a> tag to automatically click and download.
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  link.click();
});

// ========== Left navigation buttons + page switching ==========
const navBtns = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

const pageIds = [
  "page-pick",
  "page-frequency",
  "page-hotcold",
  "page-cooccur",
  "page-random",
  "page-colour",
  "page-distribution",
  "page-prize",
  "page-trend"
];

const rightPanel = document.querySelector(".sidebar-right");
const panelStats = document.getElementById("panel-stats");
const panelFreq = document.getElementById("panel-frequency");
const panelCooccur = document.getElementById("panel-cooccur");
const panelColour = document.getElementById("panel-colour");
const panelDistri = document.getElementById("panel-distribution");

navBtns.forEach((btn, idx) => {
  btn.addEventListener("click", () => {
    // Button Style switching
    navBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Pages switching
    pages.forEach(p => p.classList.remove("active-page"));
    document.getElementById(pageIds[idx]).classList.add("active-page");

    // Smart switching on the right panel
    if (pageIds[idx] === "page-pick") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = ""; 
      panelStats.style.display = "block";
      panelFreq.style.display = "none";
      panelCooccur.style.display = "none";
      panelColour.style.display = "none";
      panelDistri.style.display = "none";
    }
    else if (pageIds[idx] === "page-frequency") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = "#ffe6e6";
      panelStats.style.display = "none";
      panelFreq.style.display = "block";
      panelCooccur.style.display = "none";
      panelColour.style.display = "none";
      panelDistri.style.display = "none";
      
      resetAllBalls();
      startFrequencyPage();
    }
    else if (pageIds[idx] === "page-hotcold") {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");

      resetAllBalls();
      startHotColdPage();
    }
    else if (pageIds[idx] === "page-cooccur") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = "#e6f0ff";
      panelStats.style.display = "none"; 
      panelFreq.style.display = "none";
      panelCooccur.style.display = "block";
      panelColour.style.display = "none";
      panelDistri.style.display = "none";
  
      resetAllBalls();
      startCooccurPage();
    }
    else if (pageIds[idx] === "page-random") {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");
  
      resetAllBalls();
      startRandomnessPage();
    }
    else if (pageIds[idx] === "page-colour") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = "#ffe6e6"; 
      panelStats.style.display = "none";
      panelFreq.style.display = "none";
      panelCooccur.style.display = "none";
      panelColour.style.display = "block";
      panelDistri.style.display = "none";
  
      resetAllBalls();
      startColourPage();
    }
    else if (pageIds[idx] === "page-distribution") {
      rightPanel.style.display = "block";
      rightPanel.style.backgroundColor = "#ffe6e6";
      panelStats.style.display = "none";
      panelFreq.style.display = "none";
      panelCooccur.style.display = "none";
      panelColour.style.display = "none";
      panelDistri.style.display = "block";
  
      resetAllBalls();
      startWeekdayHeatmap();
    }
    else if (pageIds[idx] === "page-prize") {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");
    
      resetAllBalls();
      startPrizeChart();
    }
    else {
      rightPanel.style.display = "none";
      rightPanel.classList.remove("active");

      resetAllBalls();
    }
  });
});

function resetAllBalls() {
  selectedNumbers.clear();

  document.querySelectorAll(".num-ball").forEach(ball => {
    ball.classList.remove("selected");
    const text = ball.querySelector(".num-text");
    if (text) text.style.display = "flex";

    ball.style.opacity = "1";
    ball.style.backgroundColor = "transparent";

    const circle = ball.querySelector("circle");
    if (circle) {
      circle.style.display = "block";
      circle.setAttribute("stroke-dasharray", "295 295");
    }
  });

  updateAllStats();
}

// ==============================
// Page 2: Frequency
// ==============================
let freqData = {};
let freqPositionData = [];

// Fixed layout parameters
const freqRows = 7;
const freqCols = 7;
const freqSpacing = 83.15;
const offsetX = -26;
const offsetY = 20;

// Generate coordinates 1–49
function generateFreqPositionData() {
  let arr = [];
  for (let i = 0; i < freqRows; i++) {
    for (let j = 0; j < freqCols; j++) {
      const n = i * freqCols + j + 1;
      arr.push({
        n: n,
        x: j * freqSpacing + offsetX,
        y: i * freqSpacing + offsetY
      });
    }
  }
  freqPositionData = arr;
}

// Create a dedicated DIV ball for Page 2
function generateFreqDivBalls() {
  const wrap = d3.select("#freq-ball-wrap");
  wrap.selectAll(".num-ball").remove();
  generateFreqPositionData();

  // tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "page2-freq-tooltip");

  const balls = wrap.selectAll(".num-ball")
    .data(freqPositionData, d => d.n)
    .enter()
    .append("div")
    .attr("class", "num-ball")
    .style("left", d => d.x + "px")
    .style("top", d => d.y + "px")

    // Hover function
    .on("mouseover", function(e, d) {
      // Show tooltip
      tooltip
        .style("opacity", 1)
        .html(`
          Number：${d.n}<br/>
          Number of occurrences：${freqData[d.n] || 0} times
        `)
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY - 40) + "px");
    })
    .on("mousemove", function(e) {
      // Follow the mouse
      tooltip
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY - 40) + "px");
    })
    .on("mouseout", function() {
      // Hide tooltip
      tooltip.style("opacity", 0);
    });

  balls.append("div")
    .attr("class", "ball-img")
    .style("background-image", d => `url('images/ball-${d.n}.svg')`);

  balls.append("span")
    .attr("class", "num-text")
    .text(d => d.n);

  balls.each(function(d) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("ball-ring");
    svg.setAttribute("viewBox", "0 0 100 100");
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", "50");
    c.setAttribute("cy", "50");
    c.setAttribute("r", "47");
    c.setAttribute("stroke", getMarkSixColor(d.n));
    c.setAttribute("stroke-dasharray", "295 295");
    svg.appendChild(c);
    this.prepend(svg);
  });
}

// Load frequency
async function loadFrequencyData() {
  const data = await d3.csv("Mark_Six.csv");
  freqData = {};

  data.forEach(draw => {
    const allNumbers = [
      +draw['Winning Number 1'],
      +draw['2'],
      +draw['3'],
      +draw['4'],
      +draw['5'],
      +draw['6'],
      +draw['Extra Number']
    ];

    allNumbers.forEach(n => {
      if (n >= 1 && n <= 49) { 
      freqData[n] = (freqData[n] || 0) + 1;
      }
    });
  });
}

// Execute when entering Page 2
async function startFrequencyPage() {
  generateFreqPositionData();
  generateFreqDivBalls();
  await loadFrequencyData();

  sortByFreq();
}

// Sort By Frequency function
function sortByFreq() {
  const minCount = d3.min(Object.values(freqData));
  const maxCount = d3.max(Object.values(freqData));
  const sizeScale = d3.scaleSqrt().domain([minCount, maxCount]).range([20, 75]);

  const sortedNums = Object.keys(freqData).map(Number).sort((a, b) => freqData[b] - freqData[a]);

  const newPosition = sortedNums.map((n, i) => ({
    n: n,
    x: freqPositionData[i].x,
    y: freqPositionData[i].y
  }));

  d3.select("#freq-ball-wrap")
    .selectAll(".num-ball")
    .data(newPosition, d => d.n)
    .transition()
    .duration(1000)
    .delay((d, i) => i * 50)
    .style("left", d => d.x - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
    .style("top", d => d.y - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
    .style("width", d => sizeScale(freqData[d.n]) + "px")
    .style("height", d => sizeScale(freqData[d.n]) + "px")
    .on("start", function() {
      d3.select(this).classed("selected", true);
      d3.select(this).select(".num-text").style("display", "none");
      d3.select(this).select(".ball-img").style("opacity", "1");
    });
}

// Size By Frequency function
function sizeByFreq() {
  const minCount = d3.min(Object.values(freqData));
  const maxCount = d3.max(Object.values(freqData));
  const sizeScale = d3.scaleSqrt().domain([minCount, maxCount]).range([20, 75]);

  d3.select("#freq-ball-wrap")
    .selectAll(".num-ball")
    .data(freqPositionData, d => d.n)
    .transition()
    .duration(500)
    .delay((d, i) => i * 50)
    .style("left", d => d.x - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
    .style("top", d => d.y - (sizeScale(freqData[d.n]) - 70) / 2 + "px")
    .style("width", d => sizeScale(freqData[d.n]) + "px")
    .style("height", d => sizeScale(freqData[d.n]) + "px")
    .on("start", function() {
      d3.select(this).classed("selected", true);
      d3.select(this).select(".num-text").style("display", "none");
      d3.select(this).select(".ball-img").style("opacity", "1");
    });
}

// Reset function
function resetFreqBalls() {
  d3.select("#freq-ball-wrap")
    .selectAll(".num-ball")
    .data(freqPositionData, d => d.n)
    .transition()
    .duration(500)
    .delay((d, i) => i * 10)
    .style("left", d => d.x + "px")
    .style("top", d => d.y + "px")
    .style("width", "70px")
    .style("height", "70px")
    .on("end", function() {
      d3.select(this).select(".num-text").style("display", "flex");
      d3.select(this).select(".ball-img").style("opacity", "0");
      d3.select(this).classed("selected", false);
    });
}

// Button binding
document.getElementById("btnSortFreq").onclick = sortByFreq;
document.getElementById("btnSizeFreq").onclick = sizeByFreq;
document.getElementById("btnResetFreq").onclick = resetFreqBalls;

// ==============================
// Page 3: Hot & Cold
// ==============================
async function startHotColdPage() {
  await loadFrequencyData();

  const freqArray = Object.entries(freqData)
    .map(([n, count]) => ({ n: +n, count }));

  const sortedHot = [...freqArray].sort((a, b) => b.count - a.count).slice(0, 10);
  const sortedCold = [...freqArray].sort((a, b) => a.count - b.count).slice(0, 10);

  const maxCount = d3.max(freqArray, d => d.count);

  // Hot list
  const hotList = d3.select("#hot-list");
  hotList.html("");

  sortedHot.forEach((item, i) => {
      const row = hotList.append("div").attr("class", "hc-item");
      row.append("span").attr("class", "hc-rank").text(`#${i + 1}`);

      // Top 1-3 = 你原本的 SVG 球
      if (i < 3) {
          const svgWrap = row.append("div").attr("class", "hc-ball-svg");
          svgWrap.append("img")
              .attr("src", `images/ball-${item.n}.svg`)
              .attr("alt", item.n)
              .style("width", "100%")
              .style("height", "100%");
      } else {
          row.append("div")
              .attr("class", "hc-ball")
              .style("border-color", getMarkSixColor(item.n))
              .text(item.n);
      }

      const bar = row.append("div").attr("class", "hot-bar");
      bar.append("div")
          .attr("class", "hot-bar-fill")
          .style("width", `${(item.count / maxCount) * 100}%`);

      row.append("span").attr("class", "hc-count").text(item.count);
  });

  // Cold list
  const coldList = d3.select("#cold-list");
  coldList.html("");

  sortedCold.forEach((item, i) => {
      const row = coldList.append("div").attr("class", "hc-item");
      row.append("span").attr("class", "hc-rank").text(`#${i + 1}`);

      if (i < 3) {
          const svgWrap = row.append("div").attr("class", "hc-ball-svg");
          svgWrap.append("img")
              .attr("src", `images/ball-${item.n}.svg`)
              .attr("alt", item.n);
      } else {
          row.append("div")
              .attr("class", "hc-ball")
              .style("border-color", getMarkSixColor(item.n))
              .text(item.n);
      }

      const bar = row.append("div").attr("class", "cold-bar");
      bar.append("div")
          .attr("class", "cold-bar-fill")
          .style("width", `${(item.count / maxCount) * 100}%`);

      row.append("span").attr("class", "hc-count").text(item.count);
  });
}

// ==============================
// Page 4: Co-occurrence
// ==============================
let cooccurMatrix = {};
let cooccurSvg;
let linksGroup;
let nodesGroup;
let activePair = null;

async function startCooccurPage() {
    await buildCooccurrenceMatrix();

  // Create an SVG canvas
  const width = 800;
  const height = 800;
  const radius = Math.min(width, height) / 2 - 40;

  const container = d3.select("#cooccur-svg-container");

  container.html("");
  cooccurSvg = container.append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width/2}, ${height/2})`);

  linksGroup = cooccurSvg.append("g").attr("class", "links");
  nodesGroup = cooccurSvg.append("g").attr("class", "nodes");

  // Generate circular arrangement of node positions
  const numbers = d3.range(1, 50); // 1-49
  const angleStep = (2 * Math.PI) / numbers.length;
  const positions = {};
  numbers.forEach((n, i) => {
    const angle = i * angleStep - Math.PI / 2; // Arrange from top to bottom
    positions[n] = {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  });

  // Draw nodes (number circles)
  nodesGroup.selectAll("circle.cooccur-node")
    .data(numbers)
    .join("circle")
    .attr("class", "cooccur-node")
    .attr("cx", d => positions[d].x)
    .attr("cy", d => positions[d].y)
    .attr("r", 18);

  nodesGroup.selectAll("text.cooccur-text")
    .data(numbers)
    .join("text")
    .attr("class", "cooccur-text")
    .attr("x", d => positions[d].x)
    .attr("y", d => positions[d].y)
    .attr("dominant-baseline", "middle")
    .text(d => d);

  // Slide bar event: Update link
  const slider = d3.select("#thresholdSlider");
  slider.on("input", () => {
    const threshold = +slider.property("value");
    drawCooccurrenceLinks(positions, threshold);
  });

  // Initially display (threshold=47)
  drawCooccurrenceLinks(positions, 47);

  renderTopPairs();
}

// Establish co-occurrence matrix
async function buildCooccurrenceMatrix() {
  const data = await d3.csv("Mark_Six.csv");
  cooccurMatrix = {};

  // Initialization matrix
  for (let a = 1; a <= 49; a++) {
    cooccurMatrix[a] = {};
    for (let b = 1; b <= 49; b++) {
      cooccurMatrix[a][b] = 0;
    }
  }

  // Count the co-occurrences of each group of numbers
  data.forEach(d => {
    const nums = [
      +d["Winning Number 1"], 
      +d["2"], 
      +d["3"], 
      +d["4"], 
      +d["5"], 
      +d["6"], 
      +d["Extra Number"]
    ].filter(n => !isNaN(n));

    // Pairwise pairing statistics
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i];
        const b = nums[j];
        if (a !== b) {
          cooccurMatrix[a][b]++;
          cooccurMatrix[b][a]++;
        }
      }
    }
  });
}

// Draw links based on thresholds
function drawCooccurrenceLinks(positions, threshold) {
  const links = [];
  // First, collect all links that are greater than or equal to the threshold
  // Then find the maximum number of occurrences to facilitate setting the scale
  let maxCount = 0;
  for (let a = 1; a <= 49; a++) {
    for (let b = a + 1; b <= 49; b++) {
      const count = cooccurMatrix[a][b];
      if (count >= threshold) {
        links.push({
          source: a,
          target: b,
          count: count
        });
        if (count > maxCount) maxCount = count;
      }
    }
  }

  // The more, the wider the line
  const widthScale = d3.scaleLinear()
    .domain([threshold, maxCount])
    .range([0.5, 10]);

  // The more, the lighter the color
  const colorScale = d3.scaleLinear()
    .domain([threshold, maxCount])
    .range(["#2c3e80", "#b0b8e8"]);

  // Update lines
  const linkSelection = linksGroup.selectAll("path.cooccur-link")
    .data(links, d => `${d.source}-${d.target}`);

  linkSelection.exit().remove();

  linkSelection.enter()
    .append("path")
    .attr("class", "cooccur-link")
    .merge(linkSelection)
    .attr("d", d => {
      const sx = positions[d.source].x;
      const sy = positions[d.source].y;
      const tx = positions[d.target].x;
      const ty = positions[d.target].y;

      // Bézier curves for circular layouts
      const mx = (sx + tx) / 4;  
      const my = (sy + ty) / 4;
      return `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`;
    })
    .style("fill", "none")
    .style("stroke-width", d => widthScale(d.count))
    .style("stroke", d => colorScale(d.count))
    .style("stroke-opacity", 0.8)

    // Save the original style for restoration.
    .attr("data-original-width", d => widthScale(d.count))
    .attr("data-original-color", d => colorScale(d.count));
}

function renderTopPairs() {
  if (!cooccurMatrix) return;

  const allPairs = [];
  for (let a = 1; a <= 49; a++) {
    for (let b = a + 1; b <= 49; b++) {
      const cnt = cooccurMatrix[a][b];
      if (cnt > 0) {
        allPairs.push({ a, b, cnt });
      }
    }
  }

  // Take the Top 10 pairs
  const topPairs = allPairs.sort((x, y) => y.cnt - x.cnt).slice(0, 10);

  const container = document.getElementById("top-pairs-container");
  container.innerHTML = "";

  topPairs.forEach(p => {
      const el = document.createElement("div");
      el.className = "pair-card";

      el.onclick = () => {
          if (activePair?.a === p.a && activePair?.b === p.b) {
            activePair = null;
            clearAllHighlight();
          } else {
            activePair = { a: p.a, b: p.b };
            highlightConnection(p.a, p.b);
          }
      };

      el.innerHTML = `
          <div class="pair-left">
              <div class="pair-ball purple">${p.a}</div>
              <span class="pair-arrow">↔</span>
              <div class="pair-ball blue">${p.b}</div>
          </div>
          <div class="pair-right">
              <div class="pair-count">${p.cnt}</div>
              <span class="pair-text">times</span>
          </div>
      `;
    container.appendChild(el);
  });
}

// Highlight Co-occurrence connection 
function highlightConnection(a, b) {
  clearAllHighlight();

  d3.selectAll("path.cooccur-link").each(function (d) {
    if (
      (d.source === a && d.target === b) ||
      (d.source === b && d.target === a)
    ) {
      d3.select(this)
        .style("stroke", "#ffcc00")
        .style("stroke-width", 10)
        .style("stroke-opacity", 1)
        .raise(); //Dropping this line to the "top layer" to avoid blocking.
    }
  });
}
  
function clearAllHighlight() {
  d3.selectAll("path.cooccur-link").each(function () {
    const originalColor = d3.select(this).attr("data-original-color");
    const originalWidth = d3.select(this).attr("data-original-width");

    d3.select(this)
      .style("stroke", originalColor)
      .style("stroke-width", originalWidth)
      .style("stroke-opacity", 0.8);
  });
}

  
// To fixed the bug that page 1 showing wrong panel by default
window.addEventListener('DOMContentLoaded', () => {
  // Find the currently active page
  const activeBtn = document.querySelector('.nav-btn.active');
  if (activeBtn) {
      const idx = Array.from(navBtns).indexOf(activeBtn);
      // Manually trigger a click event to initialize the panel.
      navBtns[idx].click();
  }
});

// ==============================
// Page 5: Randomness
// ==============================
async function startRandomnessPage() {
  // Load data
  const data = await d3.csv("Mark_Six.csv");

  // Count the number of times each number appears
  const numCounts = {};
  for (let n = 1; n <= 49; n++) numCounts[n] = 0;

  // Calculate the sum of the 6 numbers in each period.
  const sumList = [];

  data.forEach(row => {
      const nums = [
          +row["Winning Number 1"],
          +row["2"],
          +row["3"],
          +row["4"],
          +row["5"],
          +row["6"]
      ].filter(x => !isNaN(x));

      // Number of frequencies
      nums.forEach(n => {
          if (n >= 1 && n <= 49) numCounts[n]++;
      });

      // Total for each draw
      if (nums.length === 6) {
          const sum = nums.reduce((a, b) => a + b, 0);
          sumList.push(sum);
      }
  });

  // Left Individual statistics
  const values = Object.values(numCounts);
  const avg = d3.mean(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = d3.variance(values);
  const randomness = variance < 30 ? "✅ Approx Uniform" : "❌ Not Uniform";

  document.getElementById("avg-count").innerText = avg.toFixed(1);
  document.getElementById("min-count").innerText = min;
  document.getElementById("max-count").innerText = max;
  document.getElementById("variance").innerText = variance.toFixed(2);
  document.getElementById("random-result").innerText = randomness;

  // Right Sum statistics
  const sumMean = d3.mean(sumList);
  const sumMin = Math.min(...sumList);
  const sumMax = Math.max(...sumList);
  const sumStd = d3.deviation(sumList);
  // Reasonable range of standard deviation, Determine whether it is close to the normal range
  const normalCheck = sumStd > 25 && sumStd < 55 
      ? "✅ Approx Normal" 
      : "❌ Skewed";

  document.getElementById("sum-mean").innerText = sumMean.toFixed(1);
  document.getElementById("sum-min").innerText = sumMin;
  document.getElementById("sum-max").innerText = sumMax;
  document.getElementById("sum-std").innerText = sumStd.toFixed(2);
  document.getElementById("normal-result").innerText = normalCheck;

  // Draw the Chart
  drawIndividualChart(numCounts);
  drawSumChart(sumList);
}

// Left: Number of occurrences of numbers 1-49
function drawIndividualChart(counts) {
  const container = d3.select("#chart-individual");
  container.html("");

  // Floating tooltip
  const tooltip = d3.select("body").append("div")
      .attr("id", "chart-random-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("font-size", "14px")
      .style("z-index", 1000)
      .style("display", "none");
      
  const margin = { top:20, right:0, bottom:50, left:42 };
  const w = 800;
  const h = 450;

  const svg = container.append("svg")
      .attr("width", w)
      .attr("height", h);

  const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const data = [];
  for (let n=1; n<=49; n++) {
      data.push({ num:n, count:counts[n] });
  }

  const x = d3.scaleBand()
      .domain(data.map(d => d.num))
      .range([0, innerW])
      .padding(0.2);

  const y = d3.scaleLinear()
      .domain([0, d3.max(data, d=>d.count) + 5])
      .range([innerH, 0]);

  // bar with hover effect
  g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.num))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => innerH - y(d.count))
      .attr("fill", "#4285F4")
      .on("mouseover", function(event, d) {
          d3.select(this).attr("fill", "#1976D2");
          tooltip.style("display", "block")
              .html(`Number: ${d.num}<br>Frequency: ${d.count}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
          d3.select(this).attr("fill", "#4285F4");
          tooltip.style("display", "none");
      });

  // mean line
  const avg = d3.mean(data, d=>d.count);
  g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", y(avg))
      .attr("y2", y(avg))
      .attr("stroke", "red")
      .attr("stroke-width",2)
      .attr("stroke-dasharray","4,4");

  g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("font-size",9);

  g.append("g")
      .call(d3.axisLeft(y));
  
  //  X & Y Axis Label
  g.append("text")
      .attr("x", innerW / 2 -20)
      .attr("y", innerH + 40)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Number");

  g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 10)
      .attr("x", -innerH / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Frequency");
}

// Left：Sum of 6 numbers
function drawSumChart(sumList) {
  const container = d3.select("#chart-sum");
  container.html("");

  // Floating tooltip
  const tooltip = d3.select("body").append("div")
      .attr("id", "chart-random-tooltip-sum")
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("pointer-events", "none")
      .style("font-size", "14px")
      .style("z-index", 1000)
      .style("display", "none");


  const margin = { top:20, right:20, bottom:50, left:60 };
  const w = 700;
  const h = 450;

  const svg = container.append("svg")
      .attr("width", w)
      .attr("height", h);

  const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const x = d3.scaleLinear()
      .domain([d3.min(sumList), d3.max(sumList)])
      .range([0, innerW]);

  const bins = d3.histogram()
      .domain(x.domain())
      .thresholds(20)
      (sumList);

  const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d=>d.length) + 2])
      .range([innerH, 0]);

  // bar with hover effect
  g.selectAll("rect")
      .data(bins)
      .enter()
      .append("rect")
      .attr("x", d => x(d.x0))
      .attr("y", d => y(d.length))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("height", d => innerH - y(d.length))
      .attr("fill", "#ff6b6b")
      .on("mouseover", function(event, d) {
          d3.select(this).attr("fill", "#e53935");
          tooltip.style("display", "block")
              .html(`Sum: ${d.x0} - ${d.x1}<br>Count: ${d.length}`)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
          d3.select(this).attr("fill", "#ff6b6b");
          tooltip.style("display", "none");
      });

  g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x));

  g.append("g")
      .call(d3.axisLeft(y));

  // X & Y Axis Label
  g.append("text")
      .attr("x", innerW / 2 + 35)
      .attr("y", innerH + 40)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Sum of 6 Numbers");

  g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 25)
      .attr("x", -innerH / 2)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Count");
}

// ==============================
// Page 6: Colour Chart
// ==============================
let colourDrawData = [];
let colourSortMode = null; 

async function startColourPage() {
  const raw = await d3.csv("Mark_Six.csv");

  colourDrawData = raw.map(d => {
    const main = [
      +d["Winning Number 1"],
      +d["2"],
      +d["3"],
      +d["4"],
      +d["5"],
      +d["6"]
    ].filter(n => !isNaN(n));

    const extra = +d["Extra Number"] || null;
    return {
      date: d["Date"],
      main,
      extra
    };
  });

  d3.select("#includeExtra").on("change", updateColourChart);
  updateColourChart();
}

function updateColourChart() {
  const includeExtra = d3.select("#includeExtra").property("checked");
  computeColourStats(includeExtra);
  drawColourBarChart();
  drawColourDrawTable();
}

let colourSummary = [];

function computeColourStats(includeExtra) {
  let redMain = 0, redExtra = 0;
  let blueMain = 0, blueExtra = 0;
  let greenMain = 0, greenExtra = 0;

  colourDrawData.forEach(row => {
    // Calculate main number only
    row.main.forEach(n => {
      if(redNumbers.includes(n)) redMain++;
      if(blueNumbers.includes(n)) blueMain++;
      if(greenNumbers.includes(n)) greenMain++;
    });
    // Calculate extra number separately
    if(row.extra) {
      const n = row.extra;
      if(redNumbers.includes(n)) redExtra++;
      if(blueNumbers.includes(n)) blueExtra++;
      if(greenNumbers.includes(n)) greenExtra++;
    }
  });

  colourSummary = [
    {
      name: "Red",
      main: redMain,
      extra: redExtra,
      total: redMain + redExtra,
      fill: "#ff6b6b"
    },
    {
      name: "Blue",
      main: blueMain,
      extra: blueExtra,
      total: blueMain + blueExtra,
      fill: "#4dabf7"
    },
    {
      name: "Green",
      main: greenMain,
      extra: greenExtra,
      total: greenMain + greenExtra,
      fill: "#51c466"
    }
  ];
}

function drawColourBarChart() {
  const container = d3.select("#colour-summary-chart");
  container.html("");

  const width = 800;
  const height = 600;
  const margin = { top: 40, right: 30, bottom: 50, left: 70 };

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const includeExtra = d3.select("#includeExtra").property("checked");

  const x = d3.scaleBand()
    .domain(["Red", "Blue", "Green"])
    .range([0, width])
    .padding(0.4);

  // Fixed Y-axis
  const fixedMax = d3.max(colourSummary, d => d.total);
  const y = d3.scaleLinear()
    .domain([0, fixedMax])
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .style("font-size", "16px");

  svg.append("g")
    .call(d3.axisLeft(y).ticks(10))
    .style("font-size", "13px");

// Main bar
svg.selectAll("rect.main")
  .data(colourSummary)
  .enter()
  .append("rect")
  .attr("class", "main-bar")
  .attr("x", d => x(d.name))
  .attr("y", d => y(d.main))
  .attr("width", x.bandwidth())
  .attr("height", d => height - y(d.main))
  .attr("fill", d => d.fill)
  .attr("rx", 6)
  .style("cursor", "pointer")
  // Preset transparency (light color, gentle on the eyes)
  .style("opacity", 0.75)
  .on("click", function(e, d) {
    const key = d.name.toLowerCase();
    // Repeated click = Cancel sorting
    colourSortMode = (colourSortMode === key) ? null : key;

    // Reset all bars globally to the default style.
    svg.selectAll(".main-bar")
      .style("opacity", 0.75)
      .style("stroke", "none")
      .style("stroke-width", 0);

    // Currently clicked bar highlighted
    if(colourSortMode){
      d3.select(this)
        .style("opacity", 1)
        .style("stroke", "#222")
        .style("stroke-width", 3);
    }

    // Re-render the right-hand number grouping
    drawColourDrawTable();
  });

  // Check the box, then Draw Extra + separator line
  if (includeExtra) {
    svg.selectAll("rect.extra")
      .data(colourSummary)
      .enter()
      .append("rect")
      .attr("class", "extra")
      .attr("x", d => x(d.name))
      .attr("y", d => y(d.total))
      .attr("width", x.bandwidth())
      .attr("height", d => y(d.main) - y(d.total))
      .attr("fill", d => d.fill)
      .attr("opacity", 0.3)
      .attr("rx", 4);

    // White dividing line
    svg.selectAll(".divider")
      .data(colourSummary)
      .enter()
      .append("line")
      .attr("x1", d => x(d.name))
      .attr("x2", d => x(d.name) + x.bandwidth())
      .attr("y1", d => y(d.main))
      .attr("y2", d => y(d.main))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
  }

  //Text display logic
  if (includeExtra) {
    // Main in the center of the bar.
    svg.selectAll(".text-main-inside")
      .data(colourSummary)
      .enter()
      .append("text")
      .attr("x", d => x(d.name) + x.bandwidth() / 2)
      .attr("y", d => height - (height - y(d.main)) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text(d => d.main)
      .style("fill", "#000")
      .style("font-weight", "bold")
      .style("font-size", "16px");

    // Extra in the center of the light-colored area.
    svg.selectAll(".text-extra-inside")
      .data(colourSummary)
      .enter()
      .append("text")
      .attr("x", d => x(d.name) + x.bandwidth() / 2)
      .attr("y", d => y(d.total) + (y(d.main) - y(d.total)) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text(d => d.extra)
      .style("fill", "#000")
      .style("font-weight", "bold")
      .style("font-size", "15px");

    // Top: Total
    svg.selectAll(".text-total")
      .data(colourSummary)
      .enter()
      .append("text")
      .attr("x", d => x(d.name) + x.bandwidth() / 2)
      .attr("y", d => y(d.total) - 12)
      .attr("text-anchor", "middle")
      .text(d => `Total: ${d.total}`)
      .style("fill", "#222")
      .style("font-weight", "bold")
      .style("font-size", "15px");

  } else {
    // Top: Main
    svg.selectAll(".text-only-main")
      .data(colourSummary)
      .enter()
      .append("text")
      .attr("x", d => x(d.name) + x.bandwidth() / 2)
      .attr("y", d => y(d.main) - 12)
      .attr("text-anchor", "middle")
      .text(d => d.main)
      .style("fill", "#222")
      .style("font-weight", "bold")
      .style("font-size", "16px");
  }

  svg.append("text")
  .attr("x", width / 2)
  .attr("y", height + 40)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("fill", "#333")
  .text("Colour");

  svg.append("text")
  .attr("transform", "rotate(-90)")
  .attr("y", 0 - margin.left + 15)
  .attr("x", 0 - height / 2)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("fill", "#333")
  .text("Frequency");

  svg.append("text")
  .attr("x", width / 2)
  .attr("y", 0)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("fill", "#444")
  .style("font-weight", "500")
  .text("Click a color bar to group same-color balls on the right. Click again to reset");

}

// Right panel: colour results table
function drawColourDrawTable() {
  const wrap = d3.select("#colour-detail-table");
  wrap.html("");
  const includeExtra = d3.select("#includeExtra").property("checked");

  let showList = [...colourDrawData];

  // Sorting logic: First color + Second color + Last color
  showList.forEach(row => {
    let nums = includeExtra 
      ? [...row.main, row.extra].filter(n => n) 
      : [...row.main];

    if (colourSortMode) {
      let first  = []; // Selected color
      let second = []; 
      let third  = []; 

      nums.forEach(n => {
        const isRed = redNumbers.includes(n);
        const isBlue = blueNumbers.includes(n);
        const isGreen = greenNumbers.includes(n);

        if (colourSortMode === 'red') {
          if (isRed) first.push(n);
          else if (isBlue) second.push(n);
          else third.push(n);
        }
        else if (colourSortMode === 'blue') {
          if (isBlue) first.push(n);
          else if (isGreen) second.push(n);
          else third.push(n);
        }
        else if (colourSortMode === 'green') {
          if (isGreen) first.push(n);
          else if (isRed) second.push(n);
          else third.push(n);
        }
      });

      row.sortedNums = [...first, ...second, ...third];
    } else {
      row.sortedNums = nums;
    }
  });

  // Draw
  showList.forEach(row => {
    const line = wrap.append("div").attr("class", "draw-row");

    line.append("div")
      .attr("class", "draw-date")
      .text(row.date);

    row.sortedNums.forEach(n => {
      line.append("div")
        .attr("class", "colour-ball")
        .style("background", getMarkSixColor(n))
        .text(n);
    });
  });
}

// ==============================
// Page 7 - Weekday Heatmap
// ==============================
let weekdayFullData = [];
let includeExtraNumber = false;
let currentWeekday = "All";
let rawData = [];

async function startWeekdayHeatmap() {
  rawData = await d3.csv("Mark_Six.csv");
  
  // First Statistical
  recalculateData();
  
  // Draw Heatmap
  drawHeatmap(currentWeekday);

  // Weekday buttons
  d3.selectAll(".weekday-btn").on("click", function(){
    d3.selectAll(".weekday-btn").classed("active", false);
    d3.select(this).classed("active", true);
    currentWeekday = d3.select(this).text();
    drawHeatmap(currentWeekday);
  });

  // Extra toggle (Statistics will now be reset)
  d3.select("#btn-main-only").on("click", function () {
    includeExtraNumber = false;
    d3.selectAll(".extra-btn").classed("active", false);
    d3.select(this).classed("active", true);
    
    // Re-statistics and re-draw
    recalculateData(); 
    drawHeatmap(currentWeekday);
  });
  
  d3.select("#btn-include-extra").on("click", function () {
    includeExtraNumber = true;
    d3.selectAll(".extra-btn").classed("active", false);
    d3.select(this).classed("active", true);
    
    recalculateData();
    drawHeatmap(currentWeekday);
  });
}

// Recalculate statistics based on includeExtraNumber
function recalculateData() {
  const count = {};
  const weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  weekdays.forEach(w => count[w] = Array(50).fill(0));
  count.All = Array(50).fill(0);

  rawData.forEach(row => {
    const wd = row.Weekday.trim();
    const nums = [
      +row["Winning Number 1"], 
      +row["2"], 
      +row["3"],
      +row["4"], 
      +row["5"], 
      +row["6"]
    ];

    // Switch to Extra number mode
    if (includeExtraNumber) {
      nums.push(+row["Extra Number"]);
    }

    nums.forEach(n => {
      if(n>=1 && n<=49) {
        count[wd][n]++;
        count.All[n]++;
      }
    });
  });

  weekdayFullData = count;
}

// Draw Heatmap
function drawHeatmap(targetDay) {
  const container = d3.select("#weekday-heatmap");
  container.html("");

  const cols = 7;
  const rows = 7;
  const cellSize = 100;
  const width = cols * cellSize;
  const height = rows * cellSize;
  const margin = { top: 40, right: 20, bottom: 20, left: 20 };

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Prepare data: 1~49, corresponding to each cell.
  const numbers = Array.from({ length: 49 }, (_, i) => i + 1);
  const data = numbers.map((num, i) => ({
    num: num,
    count: weekdayFullData[targetDay][num],
    // Calculate cell position: which column, which row
    col: i % cols,
    row: Math.floor(i / cols)
  }));

  // Color mapping: darker = more layers
  const maxVal = d3.max(data, d => d.count);
  const colorScale = d3.scaleSequential()
    .domain([0, maxVal])
    .interpolator(d3.interpolateYlOrRd); // Yellow → Orange → Red

  // Draw grid
  svg.selectAll(".heat-cell")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "heat-cell")
    .attr("x", d => d.col * cellSize)
    .attr("y", d => d.row * cellSize)
    .attr("width", cellSize - 4) // -4 for leaving a little space
    .attr("height", cellSize - 4)
    .attr("fill", d => colorScale(d.count))
    .attr("rx", 10) // Rounded corners
    .attr("stroke", "#fff")
    .attr("stroke-width", 3);

  // Draw numbers and times
  svg.selectAll(".heat-text")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "heat-text")
    .attr("x", d => d.col * cellSize + cellSize / 2)
    .attr("y", d => d.row * cellSize + cellSize / 2 - 10)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text(d => d.num)
    .style("fill", d => d.count > maxVal * 0.6 ? "#fff" : "#000") // White text on dark background
    .style("font-size", "28px")
    .style("font-weight", "bold");

  svg.selectAll(".heat-count")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "heat-count")
    .attr("x", d => d.col * cellSize + cellSize / 2)
    .attr("y", d => d.row * cellSize + cellSize / 2 + 15)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text(d => `${d.count}x`)
    .style("fill", d => d.count > maxVal * 0.6 ? "#fff" : "#333")
    .style("font-size", "16px");

  // 3. title of the heatmap
  let extraLabel = includeExtraNumber ? " (With Extra Number)" : " (Main Number Only)";
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text(`Number Distribution Heatmap - ${targetDay}${extraLabel}`);
}

// ==============================
// Page 8 : Prize Money
// ==============================
let isLineChart = false;
let rawPointsGlobal = [];
let overallAverageFreqGlobal = 0;
let hideZeroJackpot = false;

// initialization
async function startPrizeChart() {
  const raw = await d3.csv("Mark_Six.csv");
  if (!Data || !Data.numberStats) return;

  rawPointsGlobal = raw.map(row => {
    const nums = [
      +row["Winning Number 1"],
      +row["2"],
      +row["3"],
      +row["4"],
      +row["5"],
      +row["6"]];

    let totalFreq = 0;
    nums.forEach(n => { totalFreq += Data.numberStats[n]?.appearances || 0; });

    const avgFreq = totalFreq / 6;

    const div1Winner = +row["Division 1 Winners"] || 0;
    const div1Prize = +row["Division 1 Prize"] || 0;
    const jackpot = div1Winner * div1Prize;

    const drawDate = row["Date"] || "N/A";

    return { avgFreq, jackpot, drawDate };
  });

  overallAverageFreqGlobal = d3.mean(rawPointsGlobal, d => d.avgFreq);
  renderChart();
}

// Rendering Chart
function renderChart() {
  let data = hideZeroJackpot
    ? rawPointsGlobal.filter(d => d.jackpot > 0)
    : rawPointsGlobal;

  if (isLineChart) renderLineChart(data);
  else renderScatterChart(data);
}

// Rendering Scatter Chart
function renderScatterChart(data) {
  const container = d3.select("#prize-scatter-chart");
  container.html("");
  d3.select("#toggleChartBtn").text("Switch to Line Chart");

  const w = 980, h = 550;
  const margin = {top:55, right:30, bottom:70, left:85};
  const svg = container.append("svg")
    .attr("width",w)
    .attr("height",h)
    .append("g")
    .attr("transform",`translate(${margin.left},${margin.top})`);

  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain(d3.extent(data,d=>d.avgFreq)).range([0,innerW]);
  const y = d3.scaleLinear().domain([0, d3.max(data,d=>d.jackpot)||1]).range([innerH,0]);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart-prize-tooltip");

  // Scatter + Hover
  svg.selectAll(".chart-dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class","chart-dot")
    .attr("r",4.5)
    .attr("cx",d=>x(d.avgFreq))
    .attr("cy",d=>y(d.jackpot))
    .on("mouseover", function(event,d) {
      tooltip.style("opacity",1)
        .html(`
          Draw Date: ${d.drawDate}<br/>
          Average Appearance: ${d.avgFreq.toFixed(2)}<br/>
          Jackpot:HK$ ${(d.jackpot/1000000).toFixed(1)}  Million
        `)
        .style("left", (event.pageX+15)+"px")
        .style("top", (event.pageY-28)+"px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity",0);
    });

  // Vertical average line
  svg.append("line")
    .attr("class","vertical-average-line")
    .attr("x1",x(overallAverageFreqGlobal))
    .attr("x2",x(overallAverageFreqGlobal))
    .attr("y1",0)
    .attr("y2",innerH);

  // Vertical average line label
  svg.append("text")
    .attr("class","average-line-label")
    .attr("x",x(overallAverageFreqGlobal))
    .attr("y", -5)
    .text(`Average: ${overallAverageFreqGlobal.toFixed(2)}`);

  // X-axis and Y-axis tick marks + numbers
  svg.append("g").attr("transform",`translate(0,${innerH})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).tickFormat(d=>`${(d/1000000).toFixed(0)}M`));

  // X-axis label
  svg.append("text")
    .attr("x",innerW/2)
    .attr("y",innerH + 45)
    .style("text-anchor","middle")
    .style("font-size","16px")
    .text("Average Appearance of the 6 Drawn Number");

  // Y-axis label
  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-innerH/2).attr("y",-70)
    .style("text-anchor","middle")
    .style("font-size","16px")
    .text("Jackpot (HK$ Million)");

  // Title
  svg.append("text")
    .attr("x",innerW/2)
    .attr("y",-40)
    .style("text-anchor","middle")
    .style("font-size","20px")
    .style("font-weight","bold")
    .text(`Jackpot vs Number Frequency (Scatter ${hideZeroJackpot ? '- Exclude 0' : '- Include 0'})`);
}

// Rendering Scatter Chart
function renderLineChart(data) {
  const container = d3.select("#prize-scatter-chart");
  container.html("");
  d3.select("#toggleChartBtn").text("Switch to Scatter Chart");

  const bins = d3.bin().domain(d3.extent(data,d=>d.avgFreq)).thresholds(5)(data.map(d=>d.avgFreq));
  const lineData = bins.map(bin=>{
    const g = data.filter(d=>d.avgFreq>=bin.x0&&d.avgFreq<bin.x1);
    return g.length?{
      avgFreq:(bin.x0+bin.x1)/2,
      avgJackpot:d3.mean(g,d=>d.jackpot)
    }:null;
  }).filter(Boolean);

  const w = 980, h = 550;
  const margin = {top: 55, right: 30, bottom: 70, left: 85};
  const svg = container.append("svg")
    .attr("width",w)
    .attr("height",h)
    .append("g")
    .attr("transform",`translate(${margin.left},${margin.top})`);

  const innerW = w - margin.left - margin.right;
  const innerH = h - margin.top - margin.bottom;

  const x = d3.scaleLinear().domain(d3.extent(data,d=>d.avgFreq)).range([0,innerW]);

  const y = d3.scaleLinear().domain([0,d3.max(lineData,d=>d.avgJackpot)||1]).range([innerH,0]);

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "chart-prize-tooltip");

  // Line + Hover
  const line=d3.line()
    .x(d=>x(d.avgFreq))
    .y(d=>y(d.avgJackpot))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(lineData)
    .attr("class","chart-line-path")
    .attr("d",line);

  svg.selectAll(".chart-line-point")
    .data(lineData).enter().append("circle")
    .attr("class","chart-line-point").attr("r",7)
    .attr("cx",d=>x(d.avgFreq)).attr("cy",d=>y(d.avgJackpot))
    .on("mouseover", function(event,d) {
      tooltip.style("opacity",1)
        .html(`
          Frequency Group<br/>
          Group Avg: ${d.avgFreq.toFixed(2)}<br/>
          Avg Jackpot:HK$ ${(d.avgJackpot/1000000).toFixed(1)}  Million
        `)
        .style("left", (event.pageX+15)+"px")
        .style("top", (event.pageY-28)+"px");
    })
    .on("mouseout", function() {
      tooltip.style("opacity",0);
    });

  // Vertical average line
  svg.append("line").attr("class","vertical-average-line")
    .attr("x1",x(overallAverageFreqGlobal))
    .attr("x2",x(overallAverageFreqGlobal))
    .attr("y1",0).attr("y2",innerH);

  // Vertical average line label
  svg.append("text").attr("class","average-line-label")
    .attr("x",x(overallAverageFreqGlobal))
    .attr("y",-5)
    .text(`Average: ${overallAverageFreqGlobal.toFixed(2)}`);

  // X-axis and Y-axis tick marks + numbers
  svg.append("g").attr("transform",`translate(0,${innerH})`).call(d3.axisBottom(x));
  svg.append("g").call(d3.axisLeft(y).tickFormat(d=>`${(d/1000000).toFixed(0)}M`));

  // X-axis label
  svg.append("text")
    .attr("x",innerW/2)
    .attr("y",innerH + 45)
    .style("text-anchor","middle")
    .style("font-size","16px")
    .text("Average Appearance of the 6 Drawn Number");

  // Y-axis label
  svg.append("text")
    .attr("transform","rotate(-90)")
    .attr("x",-innerH/2)
    .attr("y",-70)
    .style("text-anchor","middle")
    .style("font-size","16px")
    .text("Average Jackpot (HK$ Million)");

  // Title
  svg.append("text")
    .attr("x",innerW/2)
    .attr("y",-40)
    .style("text-anchor","middle")
    .style("font-size","20px")
    .style("font-weight","bold")
    .text(`Jackpot vs Number Frequency (Line ${hideZeroJackpot ? '- Exclude 0' : '- Include 0'})`);
}

// Buttons
d3.select("#toggleChartBtn").on("click",()=>{
  isLineChart=!isLineChart;
  renderChart();
});

d3.select("#filterZeroBtn").on("click",()=>{
  hideZeroJackpot=!hideZeroJackpot;
  d3.select("#filterZeroBtn").text(
    hideZeroJackpot ? "Show 0 Jackpot" : "Hide 0 Jackpot"
  );
  renderChart();
});
