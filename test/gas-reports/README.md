# Gas Reports & Analysis

This directory contains **live gas usage analysis** and comprehensive reporting for the Compensator system.

## 🚀 Current Status

**✅ LIVE SYSTEM ACTIVE**: The gas analysis framework is now fully operational and generates real-time gas reports from actual contract interactions.

## 🛠️ Available Tools

### **1. Live Gas Regression Detection Framework**
Located in `test/helpers/GasRegressionDetector.js`

**Features:**
- ✅ **Real-time gas measurement** from actual contract calls
- ✅ **Automatic baseline setting** for core operations
- ✅ **Gas regression detection** with configurable thresholds
- ✅ **Performance trend analysis** over time
- ✅ **Comprehensive data persistence** to JSON files
- ✅ **Optimization recommendations** based on gas usage

### **2. Enhanced Gas Testing Suite**
Located in `test/core/compensator/gas-optimization.test.js`

**Comprehensive Tests (10+ scenarios):**
- ✅ **Baseline establishment** for core operations
- ✅ **Gas regression detection** with alerts
- ✅ **Usage trend tracking** across multiple iterations
- ✅ **Parameter comparison analysis** (different amounts, users)
- ✅ **Pattern analysis** and historical data saving
- ✅ **Multi-operation sequence testing**
- ✅ **Different deposit amount gas analysis**
- ✅ **Reward rate change gas impact**
- ✅ **Cross-parameter gas comparison**

### **3. Automated Gas Report Generator**
Located in `scripts/generate-gas-report.js`

**Features:**
- ✅ **Detailed gas reports** with statistical analysis
- ✅ **Summary reports** with key metrics
- ✅ **Live reports** for real-time monitoring
- ✅ **Trend analysis** with regression detection
- ✅ **Optimization recommendations** with actionable suggestions
- ✅ **Alert system** for critical gas issues

## 📊 Live Gas Reports

**Real-time reports generated from actual contract interactions:**

- `live-gas-report.json` - **Live gas data** from recent test runs
- `detailed-gas-report.json` - **Comprehensive analysis** with statistics
- `gas-summary.json` - **Executive summary** with key metrics

## 🔧 How to Use the Live System

### **1. Run Gas Tests (Recommended)**
```bash
# Run comprehensive gas optimization tests
npx hardhat test test/core/compensator/gas-optimization.test.js

# Run with verbose output to see real-time gas usage
npx hardhat test test/core/compensator/gas-optimization.test.js --verbose
```

### **2. Generate Gas Reports**
```bash
# Generate comprehensive gas reports
node scripts/generate-gas-report.js

# This creates:
# - detailed-gas-report.json (full analysis)
# - gas-summary.json (executive summary)
# - live-gas-report.json (current status)
```

### **3. Use Gas Regression Framework in Tests**
```javascript
// In your tests
const GasRegressionDetector = require('../helpers/GasRegressionDetector');
const detector = new GasRegressionDetector();

// Set baselines automatically
await detector.setBaseline('userDeposit', gasUsed);

// Check for regressions
const regression = detector.detectRegressions('userDeposit', newGasUsed);

// Record gas usage for analysis
detector.recordGasUsage('operationName', gasUsed, parameters);
```

## 📈 Live Gas Analysis Features

### **What's Working (Real Data):**
✅ **Live gas measurement** - Real contract interaction data  
✅ **Automatic baselines** - Set from actual test runs  
✅ **Regression detection** - Real-time performance monitoring  
✅ **Trend analysis** - Historical gas usage patterns  
✅ **Statistical analysis** - Min, max, average, median, standard deviation  
✅ **Parameter correlation** - Gas usage vs input parameters  
✅ **Multi-operation testing** - Complex scenario gas analysis  
✅ **Automated reporting** - Generate reports on demand  

### **Data Persistence:**
✅ **Gas history** - Saved to `gas-regression-data.json`  
✅ **Baseline data** - Persistent across test runs  
✅ **Statistical analysis** - Comprehensive metrics  
✅ **Trend tracking** - Long-term performance monitoring  

## 🎯 Best Practices

1. **Run tests regularly** - Keep gas data current
2. **Monitor regressions** - Set up alerts for gas increases
3. **Use baselines** - Establish performance expectations
4. **Analyze trends** - Look for optimization opportunities
5. **Generate reports** - Use `scripts/generate-gas-report.js`

## 🚀 Advanced Features

### **Statistical Analysis:**
- **Central tendency** - Mean, median gas usage
- **Variability** - Standard deviation, min/max ranges
- **Trend detection** - Increasing/decreasing gas usage
- **Regression analysis** - Performance degradation detection

### **Optimization Recommendations:**
- **Critical alerts** - Operations above 200k gas
- **Warning alerts** - Operations above 100k gas
- **Specific suggestions** - Actionable optimization tips
- **Priority ranking** - High/medium/low priority issues

### **Multi-dimensional Analysis:**
- **Parameter impact** - Gas usage vs input size
- **User patterns** - Different address gas usage
- **Sequence effects** - Multi-operation gas patterns
- **Time-based trends** - Performance over time

## 📝 Current Implementation Status

**✅ FULLY OPERATIONAL**: The gas analysis system is production-ready with:

- **10+ comprehensive gas tests** covering all major operations
- **Real-time gas measurement** from actual contract calls
- **Automated regression detection** with configurable thresholds
- **Comprehensive reporting** with statistical analysis
- **CI/CD integration ready** for automated gas monitoring
- **Historical data tracking** for long-term performance analysis

## 🔄 Workflow

1. **Run tests** → `npx hardhat test test/core/compensator/gas-optimization.test.js`
2. **Data collected** → Gas usage automatically recorded and analyzed
3. **Generate reports** → `node scripts/generate-gas-report.js`
4. **Review analysis** → Check for regressions and optimization opportunities
5. **Take action** → Implement optimizations based on recommendations

## 📊 Sample Output

After running tests, you'll see:
```
Baseline set for userDeposit: 240327 gas
Baseline set for setRewardRate: 62597 gas
📊 Gas Report Generated: test/gas-reports/live-gas-report.json
📈 Run 'npx hardhat test test/core/compensator/gas-optimization.test.js' to update the report
```

**The system is now fully live and generating real gas data from actual contract interactions!** 
