// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const ComputedBidRequestTime = require('../computed/bid-request-time');
const i18n = require('lighthouse/lighthouse-core/lib/i18n/i18n');
const {auditNotApplicable} = require('../messages/common-strings');
const {Audit} = require('lighthouse');

const UIStrings = {
  title: 'First bid request time',
  failureTitle: 'Reduce time to send the first bid request',
  description: 'This metric measures the elapsed time from the start of page ' +
  'load until the first bid request is made. Delayed bid requests will ' +
  'decrease impressions and viewability, and have a negative impact on ad ' +
  'revenue. [Learn More](' +
  'https://developers.google.com/publisher-ads-audits/reference/audits/bid-request-from-page-start' +
  ').',
  displayValue: '{timeInMs, number, seconds} s',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * Audit to determine time for first ad request relative to page start.
 */
class BidRequestFromPageStart extends Audit {
  /**
   * @return {LH.Audit.Meta}
   * @override
   */
  static get meta() {
    return {
      id: 'bid-request-from-page-start',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      // @ts-ignore
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['devtoolsLogs', 'traces'],
    };
  }

  /**
   * @return {{
    *  simulate: LH.Audit.ScoreOptions, provided: LH.Audit.ScoreOptions
    * }}
    */
  static get defaultOptions() {
    return {
      simulate: {
        p10: 8900,
        median: 15500,
      },
      provided: {
        p10: 1900,
        median: 3500,
      },
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricData = {trace, devtoolsLog, settings: context.settings};
    const scoreOptions = context.options[
        context.settings.throttlingMethod == 'provided' ?
          'provided' :
          'simulate'
    ];

    const {timing} = await ComputedBidRequestTime.request(metricData, context);
    if (!(timing > 0)) { // Handle NaN, etc.
      return auditNotApplicable.NoBids;
    }

    return {
      numericValue: timing,
      numericUnit: 'millisecond',
      score: Audit.computeLogNormalScore(
        scoreOptions,
        timing,
      ),
      displayValue: str_(UIStrings.displayValue, {timeInMs: timing}),
    };
  }
}

module.exports = BidRequestFromPageStart;
module.exports.UIStrings = UIStrings;
