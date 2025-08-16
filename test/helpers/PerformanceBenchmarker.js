const { ethers } = require("hardhat");

class PerformanceBenchmarker {
  constructor() {
    this.benchmarks = new Map();
    this.scenarios = new Map();
    this.performanceThresholds = {
      executionTime: 1000, // 1 second
      gasUsage: 1000000,   // 1M gas
      memoryUsage: 100,    // 100MB
      throughput: 100       // 100 operations/second
    };
  }

  /**
   * Create a performance benchmark
   */
  createBenchmark(name, description = "") {
    const benchmark = {
      name,
      description,
      created: Date.now(),
      runs: [],
      scenarios: [],
      metadata: {},
      thresholds: { ...this.performanceThresholds }
    };

    this.benchmarks.set(name, benchmark);
    return benchmark;
  }

  /**
   * Add a scenario to a benchmark
   */
  addScenario(benchmarkName, scenarioName, setup, execute, cleanup, parameters = {}) {
    const benchmark = this.benchmarks.get(benchmarkName);
    if (!benchmark) {
      throw new Error(`Benchmark ${benchmarkName} not found`);
    }

    const scenario = {
      name: scenarioName,
      setup,
      execute,
      cleanup,
      parameters,
      runs: [],
      metadata: {}
    };

    benchmark.scenarios.push(scenario);
    this.scenarios.set(`${benchmarkName}_${scenarioName}`, scenario);
    
    return scenario;
  }

  /**
   * Run a benchmark scenario
   */
  async runScenario(benchmarkName, scenarioName, iterations = 1, options = {}) {
    const benchmark = this.benchmarks.get(benchmarkName);
    if (!benchmark) {
      throw new Error(`Benchmark ${benchmarkName} not found`);
    }

    const scenario = benchmark.scenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioName} not found in benchmark ${benchmarkName}`);
    }

    const results = {
      benchmark: benchmarkName,
      scenario: scenarioName,
      iterations,
      options,
      runs: [],
      summary: {},
      timestamp: Date.now()
    };

    console.log(`Running benchmark: ${benchmarkName} - ${scenarioName} (${iterations} iterations)`);

    for (let i = 0; i < iterations; i++) {
      const runResult = await this.runSingleIteration(scenario, i, options);
      results.runs.push(runResult);

      if (options.verbose && i % Math.max(1, Math.floor(iterations / 10)) === 0) {
        console.log(`  Iteration ${i + 1}/${iterations}: ${runResult.executionTime}ms, ${runResult.gasUsed} gas`);
      }
    }

    // Calculate summary statistics
    results.summary = this.calculateSummary(results.runs);
    
    // Store results
    scenario.runs.push(results);
    benchmark.runs.push(results);

    return results;
  }

  /**
   * Run a single iteration of a scenario
   */
  async runSingleIteration(scenario, iterationIndex, options = {}) {
    const runResult = {
      iteration: iterationIndex,
      timestamp: Date.now(),
      setupTime: 0,
      executionTime: 0,
      cleanupTime: 0,
      gasUsed: 0,
      memoryUsage: 0,
      success: false,
      error: null,
      metadata: {}
    };

    try {
      // Setup phase
      const setupStart = performance.now();
      const context = await scenario.setup();
      runResult.setupTime = performance.now() - setupStart;

      // Execution phase
      const executionStart = performance.now();
      const result = await scenario.execute(context, options);
      runResult.executionTime = performance.now() - executionStart;
      
      // Extract gas usage if available
      if (result && typeof result === 'object') {
        // Convert BigInt gas usage to number for calculations
        runResult.gasUsed = result.gasUsed ? Number(result.gasUsed) : 0;
        runResult.metadata = result.metadata || {};
      }

      // Cleanup phase
      if (scenario.cleanup) {
        const cleanupStart = performance.now();
        await scenario.cleanup(context);
        runResult.cleanupTime = performance.now() - cleanupStart;
      }

      runResult.success = true;
      runResult.metadata.context = context;

    } catch (error) {
      runResult.error = error.message;
      runResult.success = false;
    }

    return runResult;
  }

  /**
   * Calculate summary statistics for benchmark runs
   */
  calculateSummary(runs) {
    if (runs.length === 0) {
      return { message: "No runs available" };
    }

    const successfulRuns = runs.filter(r => r.success);
    if (successfulRuns.length === 0) {
      return { message: "No successful runs available" };
    }

    const executionTimes = successfulRuns.map(r => r.executionTime);
    const gasUsage = successfulRuns.map(r => r.gasUsed);
    const setupTimes = successfulRuns.map(r => r.setupTime);
    const cleanupTimes = successfulRuns.map(r => r.cleanupTime);

    const summary = {
      totalRuns: runs.length,
      successfulRuns: successfulRuns.length,
      failedRuns: runs.length - successfulRuns.length,
      successRate: (successfulRuns.length / runs.length) * 100,
      
      executionTime: {
        average: this.calculateAverage(executionTimes),
        median: this.calculateMedian(executionTimes),
        minimum: Math.min(...executionTimes),
        maximum: Math.max(...executionTimes),
        standardDeviation: this.calculateStandardDeviation(executionTimes),
        percentiles: this.calculatePercentiles(executionTimes)
      },
      
      gasUsage: {
        average: this.calculateAverage(gasUsage),
        median: this.calculateMedian(gasUsage),
        minimum: Math.min(...gasUsage),
        maximum: Math.max(...gasUsage),
        standardDeviation: this.calculateStandardDeviation(gasUsage),
        percentiles: this.calculatePercentiles(gasUsage)
      },
      
      setupTime: {
        average: this.calculateAverage(setupTimes),
        median: this.calculateMedian(setupTimes),
        minimum: Math.min(...setupTimes),
        maximum: Math.max(...setupTimes)
      },
      
      cleanupTime: {
        average: this.calculateAverage(cleanupTimes),
        median: this.calculateMedian(cleanupTimes),
        minimum: Math.min(...cleanupTimes),
        maximum: Math.max(...cleanupTimes)
      },
      
      throughput: {
        operationsPerSecond: 1000 / this.calculateAverage(executionTimes),
        gasPerSecond: this.calculateAverage(gasUsage) / (this.calculateAverage(executionTimes) / 1000)
      }
    };

    return summary;
  }

  /**
   * Calculate average
   */
  calculateAverage(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate median
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values) {
    const avg = this.calculateAverage(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentiles
   */
  calculatePercentiles(values, percentiles = [25, 50, 75, 90, 95, 99]) {
    const sorted = [...values].sort((a, b) => a - b);
    const result = {};
    
    for (const percentile of percentiles) {
      const index = (percentile / 100) * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      
      if (lower === upper) {
        result[`p${percentile}`] = sorted[lower];
      } else {
        const weight = index - lower;
        result[`p${percentile}`] = sorted[lower] * (1 - weight) + sorted[upper] * weight;
      }
    }
    
    return result;
  }

  /**
   * Run comparative benchmarks
   */
  async runComparativeBenchmark(benchmarkNames, scenarioName, iterations = 10) {
    const results = {};
    
    for (const benchmarkName of benchmarkNames) {
      console.log(`\nRunning comparative benchmark: ${benchmarkName}`);
      results[benchmarkName] = await this.runScenario(benchmarkName, scenarioName, iterations);
    }
    
    return this.analyzeComparativeResults(results);
  }

  /**
   * Analyze comparative benchmark results
   */
  analyzeComparativeResults(results) {
    const analysis = {
      timestamp: new Date().toISOString(),
      benchmarks: Object.keys(results),
      comparison: {},
      recommendations: []
    };

    const benchmarks = Object.keys(results);
    
    // Compare execution times
    const executionTimes = benchmarks.map(name => ({
      name,
      average: results[name].summary.executionTime.average,
      median: results[name].summary.executionTime.median
    }));

    const fastestExecution = executionTimes.reduce((min, current) => 
      current.average < min.average ? current : min
    );

    const slowestExecution = executionTimes.reduce((max, current) => 
      current.average > max.average ? current : max
    );

    analysis.comparison.executionTime = {
      fastest: fastestExecution.name,
      slowest: slowestExecution.name,
      performanceGap: slowestExecution.average - fastestExecution.average,
      performanceRatio: slowestExecution.average / fastestExecution.average
    };

    // Compare gas usage
    const gasUsage = benchmarks.map(name => ({
      name,
      average: results[name].summary.gasUsage.average,
      median: results[name].summary.gasUsage.median
    }));

    const mostEfficient = gasUsage.reduce((min, current) => 
      current.average < min.average ? current : min
    );

    const leastEfficient = gasUsage.reduce((max, current) => 
      current.average > max.average ? current : max
    );

    analysis.comparison.gasUsage = {
      mostEfficient: mostEfficient.name,
      leastEfficient: leastEfficient.name,
      efficiencyGap: leastEfficient.average - mostEfficient.average,
      efficiencyRatio: leastEfficient.average / mostEfficient.average
    };

    // Generate recommendations
    analysis.recommendations = this.generateComparativeRecommendations(analysis.comparison);

    return analysis;
  }

  /**
   * Generate comparative recommendations
   */
  generateComparativeRecommendations(comparison) {
    const recommendations = [];
    
    if (comparison.executionTime.performanceRatio > 2) {
      recommendations.push({
        type: "Performance Gap",
        message: `Significant performance gap detected. ${comparison.executionTime.slowest} is ${comparison.executionTime.performanceRatio.toFixed(2)}x slower than ${comparison.executionTime.fastest}.`,
        priority: "high"
      });
    }
    
    if (comparison.gasUsage.efficiencyRatio > 1.5) {
      recommendations.push({
        type: "Gas Efficiency Gap",
        message: `Gas efficiency gap detected. ${comparison.gasUsage.leastEfficient} uses ${comparison.gasUsage.efficiencyRatio.toFixed(2)}x more gas than ${comparison.gasUsage.mostEfficient}.`,
        priority: "medium"
      });
    }
    
    return recommendations;
  }

  /**
   * Run stress tests
   */
  async runStressTest(benchmarkName, scenarioName, loadLevels = [1, 10, 100, 1000]) {
    const results = {};
    
    for (const load of loadLevels) {
      console.log(`\nRunning stress test with load level: ${load}`);
      
      const options = {
        concurrent: true,
        loadLevel: load,
        timeout: load * 1000 // 1 second per operation
      };
      
      results[load] = await this.runScenario(benchmarkName, scenarioName, load, options);
    }
    
    return this.analyzeStressTestResults(results, loadLevels);
  }

  /**
   * Analyze stress test results
   */
  analyzeStressTestResults(results, loadLevels) {
    const analysis = {
      timestamp: new Date().toISOString(),
      loadLevels: loadLevels,
      scalability: {},
      recommendations: []
    };

    // Analyze each load level
    for (const loadLevel of loadLevels) {
      const levelResults = results[loadLevel];
      if (levelResults && levelResults.summary) {
        analysis.scalability[loadLevel] = {
          executionTime: levelResults.summary.executionTime?.average || 0,
          gasUsage: levelResults.summary.gasUsage?.average || 0,
          throughput: levelResults.summary.throughput?.operationsPerSecond || 0,
          successRate: levelResults.summary.successRate || 0
        };
      } else {
        analysis.scalability[loadLevel] = {
          executionTime: 0,
          gasUsage: 0,
          throughput: 0,
          successRate: 0
        };
      }
    }

    // Generate scalability recommendations
    const loadLevelsArray = Object.keys(analysis.scalability);
    if (loadLevelsArray.length > 1) {
      const firstLevel = analysis.scalability[loadLevelsArray[0]];
      const lastLevel = analysis.scalability[loadLevelsArray[loadLevelsArray.length - 1]];
      
      const executionTimeScaling = lastLevel.executionTime / firstLevel.executionTime;
      const gasUsageScaling = lastLevel.gasUsage / firstLevel.gasUsage;
      
      if (executionTimeScaling > 2) {
        analysis.recommendations.push({
          type: "Performance Warning",
          message: "Execution time scales poorly with load. Consider optimization.",
          priority: "high"
        });
      }
      
      if (gasUsageScaling > 2) {
        analysis.recommendations.push({
          type: "Gas Warning",
          message: "Gas usage scales poorly with load. Consider gas optimization.",
          priority: "medium"
        });
      }
    }

    return analysis;
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(benchmarkNames = null) {
    const benchmarks = benchmarkNames || Array.from(this.benchmarks.keys());
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBenchmarks: benchmarks.length,
        totalScenarios: 0,
        totalRuns: 0
      },
      benchmarks: {},
      topPerformers: [],
      recommendations: []
    };

    for (const benchmarkName of benchmarks) {
      const benchmark = this.benchmarks.get(benchmarkName);
      if (!benchmark) continue;
      
      report.summary.totalScenarios += benchmark.scenarios.length;
      report.summary.totalRuns += benchmark.runs.length;
      
      report.benchmarks[benchmarkName] = {
        scenarios: benchmark.scenarios.length,
        runs: benchmark.runs.length,
        lastRun: benchmark.runs.length > 0 ? benchmark.runs[benchmark.runs.length - 1].timestamp : null
      };
    }
    
    // Find top performers
    const allRuns = [];
    for (const benchmark of this.benchmarks.values()) {
      for (const run of benchmark.runs) {
        if (run.summary && run.summary.executionTime) {
          allRuns.push({
            benchmark: run.benchmark,
            scenario: run.scenario,
            averageTime: run.summary.executionTime.average,
            averageGas: run.summary.gasUsage.average
          });
        }
      }
    }
    
    report.topPerformers = allRuns
      .sort((a, b) => a.averageTime - b.averageTime)
      .slice(0, 10);
    
    return report;
  }

  /**
   * Export benchmark data
   */
  exportBenchmarkData(benchmarkName, format = "json") {
    const benchmark = this.benchmarks.get(benchmarkName);
    if (!benchmark) {
      throw new Error(`Benchmark ${benchmarkName} not found`);
    }
    
    const data = {
      name: benchmark.name,
      description: benchmark.description,
      created: benchmark.created,
      scenarios: benchmark.scenarios.map(s => ({
        name: s.name,
        parameters: s.parameters,
        runs: s.runs
      })),
      runs: benchmark.runs,
      metadata: benchmark.metadata
    };
    
    if (format === "csv") {
      return this.convertBenchmarkToCSV(data);
    }
    
    return data;
  }

  /**
   * Convert benchmark data to CSV
   */
  convertBenchmarkToCSV(data) {
    const csvRows = [];
    
    // Header
    csvRows.push("Benchmark,Scenario,Iteration,ExecutionTime,GasUsed,Success,Error");
    
    // Data rows
    for (const run of data.runs) {
      for (const singleRun of run.runs) {
        csvRows.push([
          data.name,
          run.scenario,
          singleRun.iteration,
          singleRun.executionTime,
          singleRun.gasUsed,
          singleRun.success,
          singleRun.error || ""
        ].join(","));
      }
    }
    
    return csvRows.join("\n");
  }

  /**
   * Clean up old benchmark data
   */
  cleanupOldData(daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;
    
    for (const benchmark of this.benchmarks.values()) {
      const originalRuns = benchmark.runs.length;
      benchmark.runs = benchmark.runs.filter(r => r.timestamp > cutoffTime);
      cleanedCount += (originalRuns - benchmark.runs.length);
      
      for (const scenario of benchmark.scenarios) {
        const originalScenarioRuns = scenario.runs.length;
        scenario.runs = scenario.runs.filter(r => r.timestamp > cutoffTime);
        cleanedCount += (originalScenarioRuns - scenario.runs.length);
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} old benchmark runs`);
    return cleanedCount;
  }

  /**
   * Reset all benchmark data
   */
  reset() {
    this.benchmarks.clear();
    this.scenarios.clear();
    console.log("Performance benchmarker reset");
  }
}

module.exports = PerformanceBenchmarker;
