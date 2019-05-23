# Nest Cloud Pub/Sub Transport

[![CircleCI](https://circleci.com/gh/gojob-1337/nest-cloud-pub-sub-transport.svg?style=svg)](https://circleci.com/gh/gojob-1337/nest-cloud-pub-sub-transport)

A Custom Transport strategy for [Cloud Pub/Sub](https://cloud.google.com/pubsub) in [Nest microservices](https://docs.nestjs.com/microservices/basics).

> TODO: in order to open-source it for NestJs, we must use `loadPackage` (from `Server`)
> to load `@google-cloud/pubsub` dynamically instead of having it installed
> in the dependenices of the project. Also, all types used from this package
> should be duplicated into local types/interfaces.

## Getting started

```bash
yarn add @gojob/nest-cloud-pub-sub-transport
# or
npm install @gojob/nest-cloud-pub-sub-transport
```

Here is an example of implementation in your Nest application:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.connectMicroservice({
    strategy: new CloudServerPubSub({
      // "clientConfig": configuration passed "as is" to the Cloud PubSub client
      clientConfig: {
        keyFile: configService.get('GCP_KEY_FILE_PUBSUB'),
      },
      // "options": custom options, specific to this package
      options: {
        logger: app.get(LOGGER),
        // useful when your app is using a single topic & subscription
        defaultTopic: configService.get('DEFAULT_PUB_SUB_TOPIC'),
        defaultSubscription: configService.get('DEFAULT_PUB_SUB_SUBSCRIPTION'),
      },
    }),
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}
```

Then use `@EventPattern` from `@nestjs/microservices` to decorate the event handlers which will be called when a new Pub/Sub message is received in your target topic(s).

## Contributing

| Command            | Action                                                 |
| ------------------ | ------------------------------------------------------ |
| `yarn compile`     | Ensure the TypeScript code can be compiled using `tsc` |
| `yarn build`       | Build the project (transpile the code to JavaScript)   |
| `yarn lint`        | Lint the code (`ESLint`)                               |
| `yarn test`        | Run unit tests                                         |
| `yarn integration` | Run integration tests                                  |
