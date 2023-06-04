import { PrismaClient } from '@prisma/client';

const env = process.env.NODE_ENV;

function clientFactory(env: string): PrismaClient {
  if (env !== 'dev') {
    return new PrismaClient();
  }

  const client = new PrismaClient({
    // log: [
    //   {
    //     emit: 'event',
    //     level: 'query',
    //   },
    //   {
    //     emit: 'stdout',
    //     level: 'error',
    //   },
    //   {
    //     emit: 'stdout',
    //     level: 'info',
    //   },
    //   {
    //     emit: 'stdout',
    //     level: 'warn',
    //   },
    // ],
  });

  // client.$on('query', (e) => {
  //   console.log('\nQuery: ' + e.query);
  //   console.log('Params: ' + e.params);
  //   console.log('Duration: ' + e.duration + 'ms');
  // });

  return client;
}

const client = clientFactory(env!);

export { client };
