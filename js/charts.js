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
      values.push(data[dateStr] || 0);
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
    
    // Prepare data: aggregate accuracy across all days
    const accuracyData = this.progressData.accuracy || {};
    let totalCorrect = 0;
    let totalIncorrect = 0;
    
    Object.values(accuracyData).forEach(day => {
      totalCorrect += day.correct || 0;
      totalIncorrect += day.incorrect || 0;
    });
    
    const total = totalCorrect + totalIncorrect;
    const correctPercentage = total > 0 ? (totalCorrect / total) * 100 : 0;
    const incorrectPercentage = total > 0 ? (totalIncorrect / total) * 100 : 0;
    
    // Create the chart
    const ctx = canvas.getContext('2d');
    canvas.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Correct', 'Incorrect'],
        datasets: [{
          data: [correctPercentage, incorrectPercentage],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Accuracy: ${total > 0 ? correctPercentage.toFixed(1) : '0.0'}%`
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
      const avgRetries = dayRetries.length > 0 ? dayRetries.reduce((a, b) => a + b, 0) / dayRetries.length : 0;
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
      const avgTime = dayTimes.length > 0 ? dayTimes.reduce((a, b) => a + b, 0) / dayTimes.length : 0;
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
    
    // Prepare data: average retries and time per note
    const notesData = this.progressData.hardestNotes || {};
    const noteNames = Object.keys(notesData);
    const avgRetries = [];
    const avgTime = [];
    
    noteNames.forEach(note => {
      const noteStats = notesData[note];
      const retries = noteStats.retries || [];
      const times = noteStats.time || [];
      
      const avgRetry = retries.length > 0 ? retries.reduce((a, b) => a + b, 0) / retries.length : 0;
      const avgT = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      
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
            label: 'Avg Retries',
            data: avgRetries,
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1
          },
          {
            label: 'Avg Time (seconds)',
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