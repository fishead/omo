import path from 'path';
import co from 'co';
import oss from 'ali-oss';
import { version } from '../package.json';
import klaw from 'klaw';
import program from 'commander';


program.version(version);
program.usage('[command] [flags]');
program.option('--verbose', 'show verbose infomation');
program.option('--region <region>', 'region, valid regions: oss-cn-hangzhou');
program.option('--bucket <bucket>', 'OSS bucket');
program.option('--access-key-id <access-key-id>', 'access key id');
program.option('--access-key-secret <access-key-secret>', 'access key secret');


program
  .command('create <resource>')
  .description('create resource on OSS')
  .option('--file <filepath>', 'File to upload')
  .option('--dir <dirpath>', 'Dir to upload')
  .option('--key-prefix <key-prefix>', 'object key(or file path) prefix')
  .action(async function createResource(resource = '', options) {
    if (!program.accessKeyId && !process.env.ALIYUN_OSS_ACCESSKEY_ID) {
      return console.error('access key id is required');
    }

    if (!program.accessKeySecret && !process.env.ALIYUN_OSS_ACCESSKEY_SECRET) {
      console.error('access key secret is required');
    }

    if (!program.region) {
      return console.error('region is required');
    }

    if (!program.bucket) {
      return console.error('bucket is required');
    }


    const store = oss({
      accessKeyId: program.accessKeyId || process.env.ALIYUN_OSS_ACCESSKEY_ID,
      accessKeySecret: program.accessKeySecret || process.env.ALIYUN_OSS_ACCESSKEY_SECRET,
      bucket: program.bucket,
      region: program.region,
    });


    const pwd = process.cwd();
    const prefix = formatKeyPrefix(options.keyPrefix || '');


    if (resource.toLowerCase() === 'object') {
      let files = [];
      if (options.file) {
        files.push(fullPath(options.file));
      } else if (options.dir) {
        files = await getFilesInDir(fullPath(options.dir));
      } else {
        console.error('specify file or dir to upload');
      }


      files.forEach(async filepath => {
        const fileKey = path.join(prefix, filepath.replace(pwd, ''));
        console.log(`upload ${filepath} to ${fileKey}`);
        const a = await co.wrap(function *() {
          return yield store.put(fileKey, filepath);
        })();
      });
    } else {
      console.error('invalid resource type, valid resource types are: bucket, object');
    }
  });


program.command('list [resource]')
  .description('list resources on OSS')
  .option('--key-prefix <key-prefix>', 'object key(or file path) prefix')
  .action(async (resource, options) => {
    if (!program.accessKeyId && !process.env.ALIYUN_OSS_ACCESSKEY_ID) {
      return console.error('access key id is required');
    }

    if (!program.accessKeySecret && !process.env.ALIYUN_OSS_ACCESSKEY_SECRET) {
      console.error('access key secret is required');
    }

    if (!program.region) {
      return console.error('region is required');
    }

    if (!program.bucket) {
      return console.error('bucket is required');
    }


    const store = oss({
      accessKeyId: program.accessKeyId || process.env.ALIYUN_OSS_ACCESSKEY_ID,
      accessKeySecret: program.accessKeySecret || process.env.ALIYUN_OSS_ACCESSKEY_SECRET,
      bucket: program.bucket,
      region: program.region,
    });


    const prefix = formatKeyPrefix(options.keyPrefix || '');


    if (resource.toLowerCase() === 'object') {
      const res = await co.wrap(function *() {
        return yield store.list({
          prefix,
        });
      })();


      if (!res.objects) {
        return console.log(`\ntotal: 0`);
      }


      console.log(`\ntotal: ${res.objects.length}`);
      console.log(`size\tlast modified\tfile name\t`);
      res.objects.forEach(object => {
        console.log(`${object.size}\t${object.lastModified}\t${object.name}\t`);
      });
    }
  });


program.command('remove [resource]')
  .description('remove resource from OSS')
  .option('--key-prefix <key-prefix>', 'object key(or file path) prefix')
  .action(async (resource, options) => {
    if (resource.toLowerCase() === 'object') {
      if (!program.accessKeyId && !process.env.ALIYUN_OSS_ACCESSKEY_ID) {
        return console.error('access key id is required');
      }

      if (!program.accessKeySecret && !process.env.ALIYUN_OSS_ACCESSKEY_SECRET) {
        console.error('access key secret is required');
      }

      if (!program.region) {
        return console.error('region is required');
      }

      if (!program.bucket) {
        return console.error('bucket is required');
      }


      const store = oss({
        accessKeyId: program.accessKeyId || process.env.ALIYUN_OSS_ACCESSKEY_ID,
        accessKeySecret: program.accessKeySecret || process.env.ALIYUN_OSS_ACCESSKEY_SECRET,
        bucket: program.bucket,
        region: program.region,
      });


      const prefix = formatKeyPrefix(options.keyPrefix || '');


      const res = await co.wrap(function *() {
        return yield store.list({
          prefix,
        });
      })();


      if (res.objects) {
        await co.wrap(function *() {
          return yield store.deleteMulti(res.objects.map(object => object.name));
        })();
      }


      console.log('clear');
    }
  });


program.parse(process.argv);


// if program was called with no arguments, show help.
if (!program.args.length) {
  program.help();
}


function fullPath(partialPath) {
  return path.join(process.cwd(), partialPath);
}


function getFilesInDir(dir) {
  return new Promise(function(resolve, reject) {
    const files = [];
    let did = false;
    klaw(dir)
      .on('data', ({ path: filePath, stats }) => {
        if (!stats.isFile()) { return; }
        files.push(filePath);
      })
      .on('end', () => resolve(files))
      .on('error', reject);
  });
}


function trimLeadingSlash(str) {
  if (str[0] !== '/') { return str; }
  return trimLeadingSlash(str.slice(1));
}


function appendSlash(str) {
  if (str.charAt(str.length - 1) === '/') { return str; }
  return str + '/';
}


function formatKeyPrefix(prefix) {
  return trimLeadingSlash(appendSlash(prefix));
}
