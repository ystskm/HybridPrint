#::HybridPrint::

##Abstract
#### Create iframe for printing with both SVG and Canvas DOM.

##Prepare for use
in &lt;head&gt;

	<script type="text/javascript" src="http://code.jquery.com/jquery-1.9.1.min.js"></script>
	<script type="text/javascript" src="/EasySvg/EasySvg.js"></script>
	<script type="text/javascript" src="/jqCanvo/jquery.jqCanvo.js"></script>
	<script type="text/javascript" src="/HybridPrint/jquery.HybridPrint.js"></script>

##Usage
__create print iframe__

	var hp = new HybridPrint(300, 300);
in this case, a 300px x 300px print area is made.

__draw line__

	hp.line(100, 100, 200, 200);
functions for HybridPrint is bridged from EasySvg for easy use.
a part of diagonal line will be drawn.

__print page__

	hp.print();


