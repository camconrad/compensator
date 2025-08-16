const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

class GasRegressionDetector {
  constructor() {
    this.gasHistory = new Map();
    this.baselineData = new Map();
    this.regressionThreshold = 0.05; // 5% increase threshold
    this.performanceThreshold = 0.10; // 10% performance degradation threshold
    this.dataFile = "gas-regression-data.json";
    this.loadGasHistory();
  }

  /**
   * Load gas history from file
   */
  loadGasHistory() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, "utf8"));
        this.gasHistory = new Map(Object.entries(data.gasHistory || {}));
        this.baselineData = new Map(Object.entries(data.baselineData || {}));
        console.log(`Loaded gas history with ${this.gasHistory.size} operations`);
      }
    } catch (error) {
      console.log("No existing gas history found, starting fresh");
    }
  }

  /**
   * Save gas history to file
   */
  saveGasHistory() {
    try {
      // Convert BigInts to strings before saving
      const serializableHistory = new Map();
      for (const [operation, history] of this.gasHistory) {
        serializableHistory.set(operation, history.map(entry => ({
          ...entry,
          gasUsed: entry.gasUsed.toString(), // Convert BigInt to string
          timestamp: entry.timestamp
        })));
      }

      const serializableBaselines = new Map();
      for (const [operation, baseline] of this.baselineData) {
        serializableBaselines.set(operation, {
          ...baseline,
          gasUsed: baseline.gasUsed.toString() // Convert BigInt to string
        });
      }

      const data = {
        gasHistory: Object.fromEntries(serializableHistory),
        baselineData: Object.fromEntries(serializableBaselines),
        lastUpdated: Date.now()
      };

      // Save to both locations for compatibility
      const fs = require('fs');
      const path = require('path');
      
      // Save to gas-history.json in helpers directory
      const helpersPath = path.join(__dirname, 'gas-history.json');
      fs.writeFileSync(helpersPath, JSON.stringify(data, null, 2));
      
      // Save to gas-regression-data.json in root for main framework
      const rootPath = path.join(__dirname, '..', '..', 'gas-regression-data.json');
      fs.writeFileSync(rootPath, JSON.stringify(data, null, 2));
      
      console.log('Gas history saved successfully to both locations');
    } catch (error) {
      console.error('Failed to save gas history:', error.message);
    }
  }

  /**
   * Record gas usage for an operation
   */
  recordGasUsage(operationName, gasUsed, parameters = {}, metadata = {}) {
    const timestamp = Date.now();
    const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!this.gasHistory.has(operationName)) {
      this.gasHistory.set(operationName, []);
    }
    
    const operation = {
      timestamp,
      dateKey,
      gasUsed,
      parameters,
      metadata,
      blockNumber: metadata.blockNumber || 0,
      transactionHash: metadata.transactionHash || null
    };
    
    this.gasHistory.get(operationName).push(operation);
    
    // Keep only last 1000 entries per operation
    const history = this.gasHistory.get(operationName);
    if (history.length > 1000) {
      this.gasHistory.set(operationName, history.slice(-1000));
    }
    
    return operation;
  }

  /**
   * Set baseline gas usage for an operation
   */
  setBaseline(operationName, gasUsed, parameters = {}) {
    const baseline = {
      gasUsed,
      parameters,
      timestamp: Date.now(),
      version: this.getVersion()
    };
    
    this.baselineData.set(operationName, baseline);
    console.log(`Baseline set for ${operationName}: ${gasUsed} gas`);
    
    return baseline;
  }

  /**
   * Get current version (can be customized)
   */
  getVersion() {
    return process.env.TEST_VERSION || "1.0.0";
  }

  /**
   * Generate comprehensive gas report
   */
  generateGasReport() {
    const report = {
      generatedAt: Date.now(),
      reportName: "compensatorGasReport",
      summary: {
        totalOperations: this.gasHistory.size,
        totalBaselines: this.baselineData.size,
        lastUpdated: new Date().toISOString()
      },
      baselines: {},
      recentOperations: {},
      recommendations: []
    };

    // Add baseline data
    for (const [operation, baseline] of this.baselineData) {
      report.baselines[operation] = {
        gasUsed: baseline.gasUsed.toString(),
        parameters: baseline.parameters,
        timestamp: baseline.timestamp,
        version: baseline.version
      };
    }

    // Add recent operation data (last 10 per operation)
    for (const [operation, history] of this.gasHistory) {
      const recent = history.slice(-10).map(entry => ({
        gasUsed: entry.gasUsed.toString(),
        parameters: entry.parameters,
        timestamp: entry.timestamp,
        dateKey: entry.dateKey
      }));
      report.recentOperations[operation] = recent;
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations();

    return report;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Check for high gas operations
    for (const [operation, baseline] of this.baselineData) {
      const gasUsed = Number(baseline.gasUsed);
      
      if (gasUsed > 200000) {
        recommendations.push({
          type: "HIGH_GAS",
          operation,
          gasUsed: gasUsed.toString(),
          suggestion: "Consider optimizing this operation - gas usage is above 200k"
        });
      }
      
      if (gasUsed > 100000) {
        recommendations.push({
          type: "MEDIUM_GAS",
          operation,
          gasUsed: gasUsed.toString(),
          suggestion: "Monitor gas usage - consider optimizations for better efficiency"
        });
      }
    }

    // Check for gas regressions
    for (const [operation, history] of this.gasHistory) {
      if (history.length >= 2) {
        const recent = history.slice(-5);
        const avgRecent = recent.reduce((sum, entry) => sum + Number(entry.gasUsed), 0) / recent.length;
        const baseline = this.baselineData.get(operation);
        
        if (baseline && avgRecent > Number(baseline.gasUsed) * 1.1) {
          recommendations.push({
            type: "REGRESSION",
            operation,
            baselineGas: baseline.gasUsed.toString(),
            currentAvg: Math.round(avgRecent).toString(),
            suggestion: "Gas usage has increased - investigate recent changes"
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Save gas report to file
   */
  saveGasReport() {
    try {
      const report = this.generateGasReport();
      const fs = require('fs');
      const path = require('path');
      
      // Save to gas-reports directory
      const reportsDir = path.join(__dirname, '..', 'gas-reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const reportPath = path.join(reportsDir, 'live-gas-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`Gas report saved to ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error('Failed to save gas report:', error.message);
      return null;
    }
  }

  /**
   * Detect gas regressions
   */
  detectRegressions(operationName, currentGas, parameters = {}) {
    const baseline = this.baselineData.get(operationName);
    if (!baseline) {
      return {
        hasRegression: false,
        message: "No baseline data available",
        baseline: null,
        current: currentGas,
        change: 0,
        percentageChange: 0
      };
    }

    // Convert BigInt values to numbers for calculations
    const currentGasNum = Number(currentGas);
    const baselineGasNum = Number(baseline.gasUsed);
    
    const change = currentGasNum - baselineGasNum;
    const percentageChange = (change / baselineGasNum) * 100;
    const hasRegression = percentageChange > (this.regressionThreshold * 100);

    return {
      hasRegression,
      message: hasRegression 
        ? `Gas regression detected: ${percentageChange.toFixed(2)}% increase`
        : `Gas usage within acceptable range: ${percentageChange.toFixed(2)}% change`,
      baseline: baseline.gasUsed,
      current: currentGas,
      change,
      percentageChange
    };
  }

  /**
   * Analyze gas usage trends
   */
  analyzeTrends(operationName, days = 7) {
    const history = this.gasHistory.get(operationName);
    if (!history || history.length === 0) {
      return { message: "No gas history available" };
    }

    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(h => h.timestamp > cutoffTime);
    
    if (recentHistory.length === 0) {
      return { message: "No recent gas history available" };
    }

    const gasValues = recentHistory.map(h => Number(h.gasUsed)); // Convert BigInt to Number for calculations
    const avgGas = gasValues.reduce((sum, gas) => sum + gas, 0) / gasValues.length;
    const minGas = Math.min(...gasValues);
    const maxGas = Math.max(...gasValues);
    const variance = gasValues.reduce((sum, gas) => sum + Math.pow(gas - avgGas, 2), 0) / gasValues.length;
    const stdDev = Math.sqrt(variance);

    // Detect outliers (beyond 2 standard deviations)
    const outliers = recentHistory.filter(h => 
      Math.abs(Number(h.gasUsed) - avgGas) > (2 * stdDev)
    );

    // Trend analysis
    const sortedHistory = recentHistory.sort((a, b) => a.timestamp - b.timestamp);
    const trend = this.calculateTrend(gasValues);

    return {
      operation: operationName,
      period: `${days} days`,
      dataPoints: recentHistory.length,
      average: avgGas,
      minimum: minGas,
      maximum: maxGas,
      standardDeviation: stdDev,
      variance,
      outliers: outliers.length,
      trend: {
        slope: trend.slope,
        direction: trend.slope > 0 ? "increasing" : trend.slope < 0 ? "decreasing" : "stable",
        confidence: trend.confidence
      },
      recommendations: this.generateTrendRecommendations(avgGas, stdDev, trend, outliers.length)
    };
  }

  /**
   * Calculate trend using linear regression
   */
  calculateTrend(gasValues) {
    if (gasValues.length < 2) {
      return { slope: 0, confidence: 0 };
    }

    const n = gasValues.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = gasValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + (x * gasValues[i]), 0);
    const sumX2 = xValues.reduce((sum, x) => sum + (x * x), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssRes = gasValues.reduce((sum, y, i) => {
      const yPred = slope * xValues[i] + intercept;
      return sum + Math.pow(y - yPred, 2);
    }, 0);
    const ssTot = gasValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const confidence = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    
    return { slope, intercept, confidence };
  }

  /**
   * Generate trend-based recommendations
   */
  generateTrendRecommendations(avgGas, stdDev, trend, outlierCount) {
    const recommendations = [];
    
    if (trend.slope > 0 && trend.confidence > 0.7) {
      recommendations.push({
        type: "Trend Warning",
        message: "Gas usage is trending upward. Consider investigating recent changes.",
        priority: "high"
      });
    }
    
    if (stdDev > avgGas * 0.2) {
      recommendations.push({
        type: "High Variance",
        message: "Gas usage has high variance. Consider parameter validation and edge case handling.",
        priority: "medium"
      });
    }
    
    if (outlierCount > 0) {
      recommendations.push({
        type: "Outliers Detected",
        message: `${outlierCount} outlier(s) detected. Review unusual gas usage patterns.`,
        priority: "medium"
      });
    }
    
    if (trend.confidence < 0.5) {
      recommendations.push({
        type: "Low Confidence",
        message: "Trend analysis has low confidence. Consider collecting more data.",
        priority: "low"
      });
    }
    
    return recommendations;
  }

  /**
   * Compare parameter impact on gas usage
   */
  compareParameterImpact(operationName, parameterGroups) {
    const history = this.gasHistory.get(operationName);
    if (!history || history.length === 0) {
      return { message: "No gas history available" };
    }

    const comparison = {};

    for (const [groupName, parameters] of Object.entries(parameterGroups)) {
      const matchingHistory = history.filter(h => 
        this.parametersMatch(h.parameters, parameters)
      );
      
      if (matchingHistory.length > 0) {
        const gasValues = matchingHistory.map(h => Number(h.gasUsed)); // Convert BigInt to Number
        comparison[groupName] = {
          count: matchingHistory.length,
          average: gasValues.reduce((sum, gas) => sum + gas, 0) / gasValues.length,
          minimum: Math.min(...gasValues),
          maximum: Math.max(...gasValues),
          parameters
        };
      }
    }
    
    // Find the most gas-efficient parameter set
    const entries = Object.entries(comparison);
    if (entries.length > 1) {
      const sorted = entries.sort((a, b) => a[1].average - b[1].average);
      comparison.optimization = {
        mostEfficient: sorted[0][0],
        leastEfficient: sorted[sorted.length - 1][0],
        efficiencyGap: sorted[sorted.length - 1][1].average - sorted[0][1].average
      };
    }
    
    return comparison;
  }

  /**
   * Check if parameters match
   */
  parametersMatch(historyParams, targetParams) {
    for (const [key, value] of Object.entries(targetParams)) {
      if (historyParams[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate gas optimization report
   */
  generateOptimizationReport(operationNames = null) {
    const operations = operationNames || Array.from(this.gasHistory.keys());
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOperations: operations.length,
        operationsWithBaselines: 0,
        operationsWithRegressions: 0,
        totalGasSavings: 0
      },
      operations: {},
      recommendations: []
    };

    for (const operationName of operations) {
      const baseline = this.baselineData.get(operationName);
      const trend = this.analyzeTrends(operationName, 7); // Last 7 days
      
      if (baseline) {
        report.summary.operationsWithBaselines++;
        
        // Check for regressions
        const regression = this.detectRegressions(operationName, trend.average || 0);
        if (regression.hasRegression) {
          report.summary.operationsWithRegressions++;
        }
        
        // Calculate potential savings
        if (trend.average && trend.average > baseline.gasUsed) {
          report.summary.totalGasSavings += (trend.average - baseline.gasUsed);
        }
      }
      
      report.operations[operationName] = {
        baseline: baseline?.gasUsed || null,
        currentTrend: trend,
        regression: baseline ? this.detectRegressions(operationName, trend.average || 0) : null
      };
    }

    // Generate recommendations
    report.recommendations = this.generateOverallRecommendations(report);
    
    return report;
  }

  /**
   * Generate overall recommendations
   */
  generateOverallRecommendations(report) {
    const recommendations = [];
    
    if (report.summary.operationsWithRegressions > 0) {
      recommendations.push({
        type: "Regression Alert",
        message: `${report.summary.operationsWithRegressions} operations have gas regressions. Review recent changes.`,
        priority: "high"
      });
    }
    
    if (report.summary.totalGasSavings > 0) {
      recommendations.push({
        type: "Optimization Opportunity",
        message: `Potential gas savings: ${report.summary.totalGasSavings.toLocaleString()} gas units.`,
        priority: "medium"
      });
    }
    
    const operationsWithoutBaselines = report.summary.totalOperations - report.summary.operationsWithBaselines;
    if (operationsWithoutBaselines > 0) {
      recommendations.push({
        type: "Baseline Setup",
        message: `${operationsWithoutBaselines} operations lack baseline data. Set baselines for accurate regression detection.`,
        priority: "low"
      });
    }
    
    return recommendations;
  }

  /**
   * Export gas data for external analysis
   */
  exportData(format = "json") {
    const data = {
      gasHistory: Object.fromEntries(this.gasHistory),
      baselineData: Object.fromEntries(this.baselineData),
      metadata: {
        exportTime: new Date().toISOString(),
        totalOperations: this.gasHistory.size,
        totalDataPoints: Array.from(this.gasHistory.values()).reduce((sum, h) => sum + h.length, 0)
      }
    };
    
    if (format === "csv") {
      return this.convertToCSV(data);
    }
    
    return data;
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    const csvRows = [];
    
    // Header
    csvRows.push("Operation,Timestamp,Date,GasUsed,Parameters,Metadata");
    
    // Data rows
    for (const [operationName, history] of Object.entries(data.gasHistory)) {
      for (const entry of history) {
        csvRows.push([
          operationName,
          entry.timestamp,
          entry.dateKey,
          entry.gasUsed,
          JSON.stringify(entry.parameters),
          JSON.stringify(entry.metadata)
        ].join(","));
      }
    }
    
    return csvRows.join("\n");
  }

  /**
   * Clean up old data
   */
  cleanupOldData(daysToKeep = 90) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const [operationName, history] of this.gasHistory) {
      const originalLength = history.length;
      const filteredHistory = history.filter(h => h.timestamp > cutoffTime);
      
      if (filteredHistory.length < originalLength) {
        this.gasHistory.set(operationName, filteredHistory);
        cleanedCount += (originalLength - filteredHistory.length);
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} old gas history entries`);
    return cleanedCount;
  }

  /**
   * Reset all data
   */
  reset() {
    this.gasHistory.clear();
    this.baselineData.clear();
    this.saveGasHistory();
    console.log("Gas regression detector reset");
  }
}

module.exports = GasRegressionDetector;
