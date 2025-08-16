#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Gas Report Generator
 * Generates comprehensive gas reports from live gas data
 */

class GasReportGenerator {
  constructor() {
    this.dataFile = path.join(__dirname, '..', 'gas-regression-data.json');
    this.reportsDir = path.join(__dirname, '..', 'test', 'gas-reports');
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  loadGasData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        return data;
      }
      return { gasHistory: {}, baselineData: {}, lastUpdated: null };
    } catch (error) {
      console.error('Failed to load gas data:', error.message);
      return { gasHistory: {}, baselineData: {}, lastUpdated: null };
    }
  }

  generateDetailedReport() {
    const data = this.loadGasData();
    const now = new Date();
    
    const report = {
      generatedAt: now.getTime(),
      generatedAtISO: now.toISOString(),
      reportName: "compensatorDetailedGasReport",
      summary: {
        totalOperations: Object.keys(data.gasHistory || {}).length,
        totalBaselines: Object.keys(data.baselineData || {}).length,
        lastUpdated: data.lastUpdated ? new Date(data.lastUpdated).toISOString() : null,
        reportGenerated: now.toISOString()
      },
      baselines: this.formatBaselines(data.baselineData || {}),
      operations: this.formatOperations(data.gasHistory || {}),
      analysis: this.generateAnalysis(data),
      recommendations: this.generateRecommendations(data)
    };

    return report;
  }

  formatBaselines(baselineData) {
    const formatted = {};
    
    for (const [operation, baseline] of Object.entries(baselineData)) {
      formatted[operation] = {
        gasUsed: baseline.gasUsed,
        parameters: baseline.parameters || {},
        timestamp: baseline.timestamp,
        version: baseline.version || "1.0.0",
        date: new Date(baseline.timestamp).toISOString()
      };
    }

    return formatted;
  }

  formatOperations(gasHistory) {
    const formatted = {};
    
    for (const [operation, history] of Object.entries(gasHistory)) {
      if (Array.isArray(history) && history.length > 0) {
        const recent = history.slice(-20); // Last 20 operations
        
        formatted[operation] = {
          totalOperations: history.length,
          recentOperations: recent.map(entry => ({
            gasUsed: entry.gasUsed,
            parameters: entry.parameters || {},
            timestamp: entry.timestamp,
            date: new Date(entry.timestamp).toISOString(),
            dateKey: entry.dateKey
          })),
          statistics: this.calculateStatistics(history),
          trends: this.analyzeTrends(history)
        };
      }
    }

    return formatted;
  }

  calculateStatistics(history) {
    if (!Array.isArray(history) || history.length === 0) {
      return null;
    }

    const gasValues = history.map(entry => Number(entry.gasUsed));
    const sorted = gasValues.sort((a, b) => a - b);
    
    return {
      count: history.length,
      min: Math.min(...gasValues),
      max: Math.max(...gasValues),
      average: Math.round(gasValues.reduce((sum, val) => sum + val, 0) / gasValues.length),
      median: sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)],
      standardDeviation: this.calculateStandardDeviation(gasValues)
    };
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.round(Math.sqrt(avgSquaredDiff));
  }

  analyzeTrends(history) {
    if (!Array.isArray(history) || history.length < 2) {
      return null;
    }

    const recent = history.slice(-10); // Last 10 operations
    const older = history.slice(-20, -10); // Previous 10 operations
    
    if (older.length === 0) return null;

    const recentAvg = recent.reduce((sum, entry) => sum + Number(entry.gasUsed), 0) / recent.length;
    const olderAvg = older.reduce((sum, entry) => sum + Number(entry.gasUsed), 0) / older.length;
    
    const change = recentAvg - olderAvg;
    const percentageChange = (change / olderAvg) * 100;

    return {
      recentAverage: Math.round(recentAvg),
      previousAverage: Math.round(olderAvg),
      change: Math.round(change),
      percentageChange: Math.round(percentageChange * 100) / 100,
      trend: change > 0 ? "increasing" : change < 0 ? "decreasing" : "stable"
    };
  }

  generateAnalysis(data) {
    const analysis = {
      highGasOperations: [],
      gasRegressions: [],
      optimizationOpportunities: [],
      stableOperations: []
    };

    // Analyze baselines
    for (const [operation, baseline] of Object.entries(data.baselineData || {})) {
      const gasUsed = Number(baseline.gasUsed);
      
      if (gasUsed > 200000) {
        analysis.highGasOperations.push({
          operation,
          gasUsed,
          priority: "HIGH",
          suggestion: "Critical optimization needed - gas usage above 200k"
        });
      } else if (gasUsed > 100000) {
        analysis.highGasOperations.push({
          operation,
          gasUsed,
          priority: "MEDIUM",
          suggestion: "Consider optimization - gas usage above 100k"
        });
      } else if (gasUsed < 50000) {
        analysis.stableOperations.push({
          operation,
          gasUsed,
          status: "OPTIMIZED",
          note: "Gas usage is well optimized"
        });
      }
    }

    // Analyze trends for regressions
    for (const [operation, history] of Object.entries(data.gasHistory || {})) {
      if (Array.isArray(history) && history.length >= 5) {
        const trends = this.analyzeTrends(history);
        if (trends && trends.percentageChange > 10) {
          analysis.gasRegressions.push({
            operation,
            percentageIncrease: trends.percentageChange,
            currentAvg: trends.recentAverage,
            previousAvg: trends.previousAverage,
            severity: trends.percentageChange > 20 ? "HIGH" : "MEDIUM"
          });
        }
      }
    }

    return analysis;
  }

  generateRecommendations(data) {
    const recommendations = [];
    
    // High gas operations
    for (const [operation, baseline] of Object.entries(data.baselineData || {})) {
      const gasUsed = Number(baseline.gasUsed);
      
      if (gasUsed > 200000) {
        recommendations.push({
          type: "CRITICAL_OPTIMIZATION",
          operation,
          currentGas: gasUsed,
          target: "Reduce to under 150k gas",
          priority: "HIGH",
          suggestions: [
            "Review contract logic for unnecessary operations",
            "Consider batching operations",
            "Optimize storage access patterns",
            "Use more efficient data structures"
          ]
        });
      } else if (gasUsed > 100000) {
        recommendations.push({
          type: "OPTIMIZATION_NEEDED",
          operation,
          currentGas: gasUsed,
          target: "Reduce to under 80k gas",
          priority: "MEDIUM",
          suggestions: [
            "Look for redundant calculations",
            "Optimize loop operations",
            "Consider using events for data that doesn't need on-chain storage"
          ]
        });
      }
    }

    // Gas regressions
    for (const [operation, history] of Object.entries(data.gasHistory || {})) {
      if (Array.isArray(history) && history.length >= 5) {
        const trends = this.analyzeTrends(history);
        if (trends && trends.percentageChange > 10) {
          recommendations.push({
            type: "REGRESSION_DETECTED",
            operation,
            percentageIncrease: trends.percentageChange,
            priority: trends.percentageChange > 20 ? "HIGH" : "MEDIUM",
            suggestions: [
              "Review recent code changes",
              "Check for new dependencies or imports",
              "Verify gas optimization wasn't accidentally removed",
              "Consider reverting recent changes if gas increase is significant"
            ]
          });
        }
      }
    }

    return recommendations;
  }

  saveReport(report, filename = null) {
    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `gas-report-${timestamp}.json`;
    }

    const filepath = path.join(this.reportsDir, filename);
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`✅ Gas report saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to save gas report:', error.message);
      return null;
    }
  }

  generateSummaryReport() {
    const data = this.loadGasData();
    const now = new Date();
    
    const summary = {
      generatedAt: now.getTime(),
      generatedAtISO: now.toISOString(),
      reportName: "compensatorGasSummary",
      summary: {
        totalOperations: Object.keys(data.gasHistory || {}).length,
        totalBaselines: Object.keys(data.baselineData || {}).length,
        lastUpdated: data.lastUpdated ? new Date(data.lastUpdated).toISOString() : null
      },
      topOperations: this.getTopOperations(data),
      recentActivity: this.getRecentActivity(data),
      alerts: this.generateAlerts(data)
    };

    return summary;
  }

  getTopOperations(data) {
    const operations = [];
    
    for (const [operation, baseline] of Object.entries(data.baselineData || {})) {
      operations.push({
        operation,
        gasUsed: Number(baseline.gasUsed),
        timestamp: baseline.timestamp
      });
    }

    return operations
      .sort((a, b) => b.gasUsed - a.gasUsed)
      .slice(0, 10)
      .map(op => ({
        ...op,
        gasUsed: op.gasUsed.toString(),
        date: new Date(op.timestamp).toISOString()
      }));
  }

  getRecentActivity(data) {
    const recent = [];
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    for (const [operation, history] of Object.entries(data.gasHistory || {})) {
      if (Array.isArray(history)) {
        const dayActivity = history.filter(entry => entry.timestamp > oneDayAgo);
        if (dayActivity.length > 0) {
          recent.push({
            operation,
            operationsToday: dayActivity.length,
            lastOperation: new Date(dayActivity[dayActivity.length - 1].timestamp).toISOString()
          });
        }
      }
    }

    return recent;
  }

  generateAlerts(data) {
    const alerts = [];
    
    // Check for high gas operations
    for (const [operation, baseline] of Object.entries(data.baselineData || {})) {
      const gasUsed = Number(baseline.gasUsed);
      if (gasUsed > 200000) {
        alerts.push({
          level: "CRITICAL",
          message: `Operation "${operation}" uses ${gasUsed} gas - critical optimization needed`,
          operation,
          gasUsed
        });
      } else if (gasUsed > 100000) {
        alerts.push({
          level: "WARNING",
          message: `Operation "${operation}" uses ${gasUsed} gas - consider optimization`,
          operation,
          gasUsed
        });
      }
    }

    // Check for recent regressions
    for (const [operation, history] of Object.entries(data.gasHistory || {})) {
      if (Array.isArray(history) && history.length >= 5) {
        const trends = this.analyzeTrends(history);
        if (trends && trends.percentageChange > 20) {
          alerts.push({
            level: "ALERT",
            message: `Operation "${operation}" gas usage increased by ${trends.percentageChange}%`,
            operation,
            percentageIncrease: trends.percentageChange
          });
        }
      }
    }

    return alerts;
  }
}

// Main execution
function main() {
  const generator = new GasReportGenerator();
  
  console.log('🚀 Generating Gas Reports...\n');
  
  // Generate detailed report
  const detailedReport = generator.generateDetailedReport();
  const detailedPath = generator.saveReport(detailedReport, 'detailed-gas-report.json');
  
  // Generate summary report
  const summaryReport = generator.generateSummaryReport();
  const summaryPath = generator.saveReport(summaryReport, 'gas-summary.json');
  
  // Generate live report (for compatibility)
  const liveReport = {
    generatedAt: Date.now(),
    reportName: "liveGasReport",
    summary: detailedReport.summary,
    baselines: detailedReport.baselines,
    recentOperations: detailedReport.operations,
    recommendations: detailedReport.recommendations
  };
  const livePath = generator.saveReport(liveReport, 'live-gas-report.json');
  
  console.log('\n📊 Gas Reports Generated Successfully!');
  console.log(`📋 Detailed Report: ${detailedPath}`);
  console.log(`📈 Summary Report: ${summaryPath}`);
  console.log(`🔄 Live Report: ${livePath}`);
  
  if (detailedReport.recommendations.length > 0) {
    console.log('\n⚠️  Optimization Recommendations:');
    detailedReport.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.operation}: ${rec.suggestions[0]}`);
    });
  }
  
  console.log('\n💡 To update reports, run: npx hardhat test test/core/compensator/gas-optimization.test.js');
}

if (require.main === module) {
  main();
}

module.exports = GasReportGenerator;
