// js/charts.js
// This file will contain chart implementations using Chart.js

class ProgressCharts {
  constructor(progressData) {
    this.progressData = progressData;
    this.initCharts();
  }
  
  initCharts() {
    // We'll initialize all the charts here when the progress screen is shown
    this.renderDailyPracticeChart();
    this.renderAccuracyChart();
    this.renderRetriesChart();
    this.renderTimeChart();
    this.renderHardestNotesChart();
  }
  
  renderDailyPracticeChart() {
    const canvas = document.getElementById('daily-practice-chart');
    if (!canvas) return;
    
    // Clear previous chart if it exists
    const existingChart = canvas.chart;
    if (existingChart) {
      existingChart.destroy();
    }
    
    // Prepare data for the chart
    const data = this.progressData.dailyPractice || {};
    
    // Get the last 7 days of data
    const today = new Date();
    const labels = [];
    const values = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      // Ensure we're getting a numeric value
      const value = typeof data[dateStr] === 'number' ? data[dateStr] : 0;
      values.push(value);
    }
    
    // Create the chart
    const ctx = canvas.getContext('2d');
    canvas.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Practice Time (seconds)',
          data: values,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Seconds'
            }
          }
        }
      }
    });
  }
  
  renderAccuracyChart() {
    const canvas = document.getElementById('accuracy-chart');
    if (!canvas) return;
    
    // Clear previous chart if it exists
    const existingChart = canvas.chart;
    if (existingChart) {
      existingChart.destroy();
    }
    
    // Prepare data: accuracy for the last 7 days
    const accuracyData = this.progressData.accuracy || {};
    const today = new Date();
    const labels = [];
    const correctData = [];
    const incorrectData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      
      const dayData = accuracyData[dateStr] || { correct: 0, incorrect: 0 };
      correctData.push(dayData.correct || 0);
      incorrectData.push(dayData.incorrect || 0);
    }
    
    // Create the stacked bar chart
    const ctx = canvas.getContext('2d');
    canvas.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Correct Attempts',
            data: correctData,
            backgroundColor: 'rgba(16, 185, 129, 0.8)', // Green
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          },
          {
            label: 'Incorrect Attempts',
            data: incorrectData,
            backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Attempts'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const correctVal = correctData[context.dataIndex] || 0;
                const incorrectVal = incorrectData[context.dataIndex] || 0;
                const total = correctVal + incorrectVal;
                const percentage = total > 0 ? 
                  (context.parsed.y / total * 100).toFixed(1) + '%' : 
                  '0%';
                return `${context.dataset.label}: ${context.parsed.y} (${percentage} of daily total)`;
              }
            }
          }
        }
      }
    });
  }
  
  renderRetriesChart() {
    const canvas = document.getElementById('retries-chart');
    if (!canvas) return;
    
    // Clear previous chart if it exists
    const existingChart = canvas.chart;
    if (existingChart) {
      existingChart.destroy();
    }
    
    // Prepare data: average retries per day for the last 7 days
    const retriesData = this.progressData.retries || {};
    const today = new Date();
    const labels = [];
    const values = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      
      const dayRetries = retriesData[dateStr] || [];
      // Ensure dayRetries is an array and calculate average
      const avgRetries = Array.isArray(dayRetries) && dayRetries.length > 0 
        ? dayRetries.reduce((a, b) => a + b, 0) / dayRetries.length 
        : 0;
      values.push(avgRetries);
    }
    
    // Create the chart
    const ctx = canvas.getContext('2d');
    canvas.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Avg Retries per Note',
          data: values,
          fill: false,
          borderColor: 'rgba(245, 158, 11, 0.8)',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Average Retries'
            }
          }
        }
      }
    });
  }
  
  renderTimeChart() {
    const canvas = document.getElementById('time-chart');
    if (!canvas) return;
    
    // Clear previous chart if it exists
    const existingChart = canvas.chart;
    if (existingChart) {
      existingChart.destroy();
    }
    
    // Prepare data: average time per day for the last 7 days
    const timeData = this.progressData.time || {};
    const today = new Date();
    const labels = [];
    const values = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      
      const dayTimes = timeData[dateStr] || [];
      // Ensure dayTimes is an array and calculate average
      const avgTime = Array.isArray(dayTimes) && dayTimes.length > 0 
        ? dayTimes.reduce((a, b) => a + b, 0) / dayTimes.length 
        : 0;
      values.push(avgTime);
    }
    
    // Create the chart
    const ctx = canvas.getContext('2d');
    canvas.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Avg Time per Note (seconds)',
          data: values,
          fill: false,
          borderColor: 'rgba(99, 102, 241, 0.8)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Seconds'
            }
          }
        }
      }
    });
  }
  
  renderHardestNotesChart() {
    const canvas = document.getElementById('hardest-notes-chart');
    if (!canvas) return;
    
    // Clear previous chart if it exists
    const existingChart = canvas.chart;
    if (existingChart) {
      existingChart.destroy();
    }
    
    // Prepare data: average retries and time per note for the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const notesData = this.progressData.hardestNotes || {};
    const noteNames = Object.keys(notesData);
    const avgRetries = [];
    const avgTime = [];
    
    noteNames.forEach(note => {
      const noteData = notesData[note];
      
      // Aggregate data for this note across the last 7 days
      let allRetries = [];
      let allTimes = [];
      
      // Go through each day's data for this note
      Object.entries(noteData).forEach(([dateStr, dayData]) => {
        const date = new Date(dateStr);
        // Only include data from the last 7 days
        if (date >= sevenDaysAgo) {
          if (Array.isArray(dayData.retries)) {
            allRetries = allRetries.concat(dayData.retries);
          }
          if (Array.isArray(dayData.time)) {
            allTimes = allTimes.concat(dayData.time);
          }
        }
      });
      
      const avgRetry = allRetries.length > 0 ? allRetries.reduce((a, b) => a + b, 0) / allRetries.length : 0;
      const avgT = allTimes.length > 0 ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0;
      
      avgRetries.push(avgRetry);
      avgTime.push(avgT);
    });
    
    // Create the chart (horizontal bar chart with retries and time)
    const ctx = canvas.getContext('2d');
    canvas.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: noteNames,
        datasets: [
          {
            label: 'Avg Retries (Last 7 Days)',
            data: avgRetries,
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1
          },
          {
            label: 'Avg Time (seconds) (Last 7 Days)',
            data: avgTime,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: 'y', // Horizontal bar chart
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Value'
            }
          }
        }
      }
    });
  }
}

// Export the class if using modules, or attach to window if not
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressCharts;
} else {
  window.ProgressCharts = ProgressCharts;
}