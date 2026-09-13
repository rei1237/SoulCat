import type {Product} from '../payments/catalog';
import {productManifest as legacyManifest} from './legacy-product-manifest';
import {readingManifest} from './reading-manifest';
import {READING_VERSION} from './reading-policy';
export function productManifest(p:Product,topicId='general',readingMode='personal') {
 return p.manifestVersion===READING_VERSION?readingManifest(p,topicId,readingMode):legacyManifest(p,topicId);
}
