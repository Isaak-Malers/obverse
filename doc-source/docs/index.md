# Obverse


## Overview

Obverse is a library and style guide which makes developing good protractor tests easier.  This is accomplished by rigid enforcement of test rig quality, and logging quality.  There are 2 major components to accomplishing these goals, A chrome plugin which enforces test rig quality, and a testing library which enforces logging quality.

## Separation of Concerns

The goal of testing in Obverse is to separate automated tests into 3 categories basted on how robust or fragile they are:

* Test Rig (brittle, low development time)
* Test Scripts (somewhat robust, medium development time)
* Test Data (robust, long development time)

The goal of the software is to provide tools and style conventions that leverage this separation to make maintaining tests easier.  A style guide is included for how to build test-data that is completely isolated from changes to the test, allowing them to be extremely robust.  A logging library for test scripts allows tests simplifies the debugging process, allowing for a quick updating process and flexible tests.  A test rig is build automatically from data collected by a chrome extension, reducing the time required to build and update test rigs which alleviates problems with their fragility.

## API guide

An API guide is provided for using the testing library.  It is recommended to also read the style guide, which will go into details about why the API is built the way that it is.

## Style guide

The style guide provides examples and explanations for Obverse testing.  These examples will outline the benefits of writing tests with the separation of concerns mentioned above, as well as examples of how to achieve separation in a variety of scenarios.