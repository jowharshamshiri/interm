#!/usr/bin/env node

import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      suites: []
    };
  }

  async runTestFile(testFile) {
    console.log(`\n🧪 Running ${testFile}...`);
    
    return new Promise((resolve) => {
      const child = spawn('node', ['--test', testFile], {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      child.on('exit', (code) => {
        const result = {
          file: testFile,
          success: code === 0,
          stdout,
          stderr,
          exitCode: code
        };

        this.results.suites.push(result);
        this.results.total++;

        if (code === 0) {
          this.results.passed++;
          console.log(`✅ ${testFile} - PASSED`);
        } else {
          this.results.failed++;
          console.log(`❌ ${testFile} - FAILED (exit code: ${code})`);
        }

        resolve(result);
      });
    });
  }

  async findTestFiles(dir) {
    const files = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.findTestFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.name.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  async run(options = {}) {
    const { 
      pattern = null, 
      category = null,
      failFast = false,
      verbose = false 
    } = options;

    console.log('🚀 InTerm Test Suite');
    console.log('===================\n');

    // Check if build exists
    try {
      await readdir(join(__dirname, '../dist'));
    } catch (error) {
      console.error('❌ Build not found. Please run "npm run build" first.');
      process.exit(1);
    }

    const testDirs = [];
    if (!category || category === 'unit') {
      testDirs.push(join(__dirname, 'unit'));
    }
    if (!category || category === 'integration') {
      testDirs.push(join(__dirname, 'integration'));
    }
    if (!category || category === 'e2e') {
      testDirs.push(join(__dirname, 'e2e'));
    }

    let allTestFiles = [];
    for (const dir of testDirs) {
      try {
        const files = await this.findTestFiles(dir);
        allTestFiles.push(...files);
      } catch (error) {
        if (verbose) {
          console.log(`ℹ️ Skipping ${dir} - directory not found`);
        }
      }
    }

    if (pattern) {
      allTestFiles = allTestFiles.filter(file => file.includes(pattern));
    }

    if (allTestFiles.length === 0) {
      console.log('No test files found matching criteria.');
      return this.results;
    }

    console.log(`Found ${allTestFiles.length} test files to run:\n`);
    for (const file of allTestFiles) {
      console.log(`  📄 ${file.replace(__dirname, 'tests')}`);
    }

    const startTime = Date.now();

    // Run tests
    for (const testFile of allTestFiles) {
      await this.runTestFile(testFile);

      if (failFast && this.results.failed > 0) {
        console.log('\n⚡ Stopping due to --fail-fast flag');
        break;
      }
    }

    const duration = Date.now() - startTime;

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📊 Total: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);

    if (this.results.failed > 0) {
      console.log('\n💥 Failed test suites:');
      for (const suite of this.results.suites) {
        if (!suite.success) {
          console.log(`   ❌ ${suite.file.replace(__dirname, 'tests')}`);
        }
      }
    } else {
      console.log('\n🎉 All tests passed!');
    }

    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    console.log(`📈 Success Rate: ${successRate}%`);

    return this.results;
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: Math.round((this.results.passed / this.results.total) * 100)
      },
      suites: this.results.suites.map(suite => ({
        file: suite.file.replace(__dirname, 'tests'),
        success: suite.success,
        exitCode: suite.exitCode
      }))
    };

    console.log('\n📋 Test Report Generated');
    return report;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--pattern' && args[i + 1]) {
      options.pattern = args[i + 1];
      i++;
    } else if (arg === '--category' && args[i + 1]) {
      options.category = args[i + 1];
      i++;
    } else if (arg === '--fail-fast') {
      options.failFast = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--help') {
      console.log(`
InTerm Test Runner

Usage: node tests/run-tests.js [options]

Options:
  --pattern <pattern>    Only run tests matching pattern
  --category <category>  Run specific category (unit|integration|e2e)
  --fail-fast           Stop on first failure
  --verbose             Show detailed output
  --help                Show this help

Examples:
  node tests/run-tests.js                    # Run all tests
  node tests/run-tests.js --category unit    # Run only unit tests
  node tests/run-tests.js --pattern session  # Run tests with 'session' in name
  node tests/run-tests.js --fail-fast        # Stop on first failure
      `);
      process.exit(0);
    }
  }

  const runner = new TestRunner();
  const results = await runner.run(options);
  
  if (options.verbose) {
    await runner.generateReport();
  }

  // Exit with failure code if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TestRunner };