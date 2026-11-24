I’d keep Unit 0’s two-lamp, two-switch challenge exactly as it plays now. At that point, getting both switches to do what he intended is already a satisfying problem. I’d save the mystery for Unit 3, when he can build a tool that helps him solve it.

Here’s how I’d revise the rest of the curriculum. This is a proposal for the game. I checked the house and timer examples against the current simulator.
Unit 1 · Resistors and light
Introduce the photoresistor by letting him drag a shadow across the workbench. Give him a resistance meter and ask him to find the brightest spot using only the meter. A photoresistor’s resistance falls as the light on it increases. Later, when a crate casts a shadow in the factory, he’ll already understand how a machine could detect it. Adafruit’s photocell guide

Final challenge — Keep the lights on. Three lamps are installed in the house. The reading lamp needs to stay bright, the stairs need enough light to see, and the breaker trips above 0.50 A. Give him one resistor and let him choose where to put it. I tested one solution: the reading lamp retains its full 0.30 A, the two stair lamps stay lit, and the house draws about 0.45 A. The interesting decision is where to put the resistor. The photoresistor can have its own lesson and earn a second use later.
Unit 2 · Capacitors and timing
I’d add just one comparison before the challenge. Put a small capacitor and a larger one on the bench. Charge both to the same voltage, connect identical lamps, and let him predict which lamp will stay visible longer. That gives “larger capacitance” a meaning he can see. The existing charging and backup-light lessons cover the rest. OpenStax on RC charging and discharging

Final challenge — Ring the bell after three seconds. The new component is a voltage-triggered bell module. Its whole instruction card can say, “I ring when the capacitor gauge reaches 3 V.” He builds the timer, presses Test, hears the result, and adjusts. The current capacitor model reaches that mark in about 2.95 seconds with a 30 Ω resistor, so the challenge works with parts the game already has. I’d show his previous time beside the next attempt and accept a small timing window.
Unit 3 · LEDs and stage lighting
This is where I’d spend the most time on visual experiments:
- Series and parallel. Put two red footlights along the front of a stage. First wire them in series and unplug one. Then give each its own parallel branch and unplug it again. His next job is concrete: “Wire the stage so the show can go on if someone pulls out one light.”
- RGB mixing. Yes, a color-changing RGB LED is realistic. An ordinary RGB package contains separate red, green, and blue emitters. I’d give him a four-pin stage light with a protected resistor on each channel. His first cue is magenta. He has to discover which two channels to wire, and he sees the color land on the curtain. Adafruit’s RGB LED lesson
- A fading color cue. This is my favorite use of your discharge idea. Mix red and blue, then let a charged capacitor supply both channels through separate resistors. For a modeled LED whose blue emitter needs a higher forward voltage, the mix can drift toward red as the voltage falls. That gives him something more interesting to predict than “it gets dimmer.” Brightness at a given current depends on the particular emitter, so I’d model one specified part. Example RGB LED specifications
Final challenge — Identify three mystery cables. Build a two-LED tester, calibrate it on a known supply, then tag three cables as correct polarity, reversed, or dead. I’d use two separate, oppositely wired LEDs here. The best part happens after the wiring is finished: he picks up the thing he made and uses it to learn something he couldn’t see.
Unit 4 · Motors and machines
I’d give him three different jobs from the first half of the unit, with a motor at each station:
Station	What he gets to do
Brushed DC motor	Drive an empty belt, reverse the leads, and send a crate back toward himself.
Geared DC motor	Try two drives on a loaded incline. The faster setup is fun on the flat. The geared setup trades output speed for the turning force needed on the climb. Pololu’s gearmotor guide
Positional servo	Swing a sorting gate toward the left or right chute and hold it there. Give him a simple servo-controller dial so the distinction between supplying power and commanding a position is visible. Adafruit’s servo guide


Final challenge — Run the dispatch line. A crate arrives at the bottom of an incline. He chooses a drive, gets it up the belt, and positions the gate to send it into the requested bin. The first delivery can be entirely manual. Then offer a second order: “Can you make the arrival lamp come on when the crate reaches the gate?” That brings back the Unit 1 photoresistor as a beam-break sensor and the Unit 3 LED as the indicator, with a sensor-switch module handling the control signal.

That last distinction is the one I’d protect. Let him have the fun of driving his machine first. Once he’s missed a crate because he was busy operating the gate, he has his own reason to invent the arrival light.