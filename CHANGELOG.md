# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2020-02-19

### Fixed

- fix(server): subscription metadata uses the fully qualified topic name

## [1.1.0] - 2020-02-13

### Added

- feat(server): warn if target subscription is bound to an unexpected topic

### Changed

- chore(pkg): upgrade nestjs; pub/sub sdk; jest 25

## [1.0.0] - 2020-01-19

### Added

- chore: update packages and remove the nack delay (not available since node-pubsub 0.30.2)
- feat(server): Initial commit, source code & tests of server side implementation
