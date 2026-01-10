import type { Reporter, TestModule, TestCase, Vitest } from 'vitest/reporters';
import pc from 'picocolors';

interface TestStats {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  startTime: number;
}

export default class PrettyReporter implements Reporter {
  private ctx!: Vitest;
  private stats: TestStats = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    startTime: 0,
  };

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
  }

  onTestRunStart(): void {
    this.stats = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      startTime: Date.now(),
    };

    console.log();
    console.log(pc.cyan(pc.bold('  ╭─────────────────────────────────────╮')));
    console.log(
      pc.cyan(pc.bold('  │')) +
        pc.white(pc.bold('         🧪 RUNNING TESTS            ')) +
        pc.cyan(pc.bold('│'))
    );
    console.log(pc.cyan(pc.bold('  ╰─────────────────────────────────────╯')));
    console.log();
  }

  onTestModuleEnd(testModule: TestModule): void {
    const tests = this.collectTests(testModule);
    const passed = tests.filter(t => t.result()?.state === 'passed').length;
    const failed = tests.filter(t => t.result()?.state === 'failed').length;
    const skipped = tests.filter(t => t.result()?.state === 'skipped').length;

    this.stats.passed += passed;
    this.stats.failed += failed;
    this.stats.skipped += skipped;
    this.stats.total += tests.length;

    const relativePath = testModule.moduleId.replace(process.cwd() + '/', '');
    const icon = failed > 0 ? pc.red('✗') : pc.green('✓');
    const counts = this.formatCounts(passed, failed, skipped);

    console.log(`  ${icon} ${pc.dim(relativePath)} ${counts}`);

    // Show failed test details
    for (const test of tests) {
      if (test.result()?.state === 'failed') {
        console.log(pc.red(`    └─ ✗ ${test.name}`));
        const errors = test.result()?.errors;
        if (errors && errors.length > 0) {
          const errorMsg = errors[0]?.message || 'Unknown error';
          const shortMsg = errorMsg.split('\n')[0].slice(0, 80);
          console.log(pc.dim(`       ${shortMsg}`));
        }
      }
    }
  }

  onTestRunEnd(): void {
    const duration = Date.now() - this.stats.startTime;
    const { passed, failed, skipped, total } = this.stats;

    console.log();

    if (failed === 0) {
      console.log(
        pc.green(pc.bold('  ╭─────────────────────────────────────╮'))
      );
      console.log(
        pc.green(pc.bold('  │')) +
          pc.white(pc.bold('         ✨ ALL TESTS PASSED          ')) +
          pc.green(pc.bold('│'))
      );
      console.log(
        pc.green(pc.bold('  ╰─────────────────────────────────────╯'))
      );
    } else {
      console.log(pc.red(pc.bold('  ╭─────────────────────────────────────╮')));
      console.log(
        pc.red(pc.bold('  │')) +
          pc.white(pc.bold('         💥 SOME TESTS FAILED         ')) +
          pc.red(pc.bold('│'))
      );
      console.log(pc.red(pc.bold('  ╰─────────────────────────────────────╯')));
    }

    console.log();
    console.log(
      `  ${pc.green('✓')} ${pc.green(pc.bold(String(passed)))} passed`
    );
    if (failed > 0)
      console.log(`  ${pc.red('✗')} ${pc.red(pc.bold(String(failed)))} failed`);
    if (skipped > 0)
      console.log(`  ${pc.yellow('○')} ${pc.yellow(String(skipped))} skipped`);
    console.log(`  ${pc.dim('⏱')} ${pc.dim(this.formatDuration(duration))}`);
    console.log(`  ${pc.dim('Σ')} ${pc.dim(String(total))} total`);
    console.log();
  }

  private collectTests(testModule: TestModule): TestCase[] {
    const tests: TestCase[] = [];
    for (const child of testModule.children) {
      if (child.type === 'test') {
        tests.push(child);
      } else if (child.type === 'suite') {
        tests.push(...this.collectTestsFromSuite(child));
      }
    }
    return tests;
  }

  private collectTestsFromSuite(suite: {
    children: Iterable<{ type: string }>;
  }): TestCase[] {
    const tests: TestCase[] = [];
    for (const child of suite.children) {
      if (child.type === 'test') {
        tests.push(child as TestCase);
      } else if (child.type === 'suite') {
        tests.push(
          ...this.collectTestsFromSuite(
            child as { children: Iterable<{ type: string }> }
          )
        );
      }
    }
    return tests;
  }

  private formatCounts(
    passed: number,
    failed: number,
    skipped: number
  ): string {
    const parts: string[] = [];
    if (passed > 0) parts.push(pc.green(`${passed} ✓`));
    if (failed > 0) parts.push(pc.red(`${failed} ✗`));
    if (skipped > 0) parts.push(pc.yellow(`${skipped} ○`));
    return pc.dim('(') + parts.join(pc.dim(' | ')) + pc.dim(')');
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
}
