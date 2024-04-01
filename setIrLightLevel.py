#!/usr/bin/python

from gpiozero import PWMLED
import sys

led = PWMLED(23)

for line in sys.stdin:
    led.value = float(line)

