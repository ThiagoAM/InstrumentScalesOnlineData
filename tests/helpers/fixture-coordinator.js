function fixtureCoordinator(environment) {
  return (
    environment.INSTRUMENT_SCALES_EDITORIAL_COORDINATOR ||
    "synthetic-fixture-coordinator"
  );
}
module.exports = { fixtureCoordinator };
