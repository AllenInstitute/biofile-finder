#!/usr/bin/env bash

##################################################################################
# Request cache invalidation for all objects in the Cloudfront distribution      #
##################################################################################

set -e

CLOUDFRONT_DISTRIBUTION_ID=CHANGE_ME

aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"
