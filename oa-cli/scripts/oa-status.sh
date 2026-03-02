#!/usr/bin/env bash
# Watch agent status — refreshes every 2 seconds
# Usage: ./oa-status.sh
#   or:  watch -n2 oa status

exec watch -n 2 -c "oa status"
