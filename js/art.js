(function (g) {
  'use strict';
  // Original path art, drawn for HomeYear. No external assets or SVG fragment IDs.
  const H = g.HomeYear = g.HomeYear || {};
  const C = {ink:'#234c50',paper:'#fbf4e6',cream:'#e9dcc4',orange:'#ed9b53',coral:'#d97562',mint:'#8db6a0',blue:'#83a6ae',light:'#ffe3a0'};
  const p = (d,fill=C.paper,extra='') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const r = (x,y,w,h,fill,rx=0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
  const circle = (x,y,rad,fill) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}"/>`;
  const line = (x,y,x2,y2,color=C.ink,width=2) => `<path d="M${x} ${y}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  const icons = {
    rice:p('M18 16Q32 22 46 16L49 47Q32 55 15 47Z',C.cream)+p('M18 16L22 9H42L46 16',C.mint)+p('M25 29Q32 21 39 29L37 42H27Z',C.paper)+line(32,27,32,39)+line(27,31,32,34)+line(37,31,32,36),
    oil:r(24,7,16,8,C.ink,2)+p('M24 15H40V23L46 29V51H18V29L24 23Z',C.orange)+r(20,31,24,15,C.paper,3)+p('M32 33Q21 43 32 44Q43 43 32 33Z',C.mint),
    pork:p('M12 27Q10 12 27 14Q42 11 51 27Q55 41 39 49Q23 54 14 41Z',C.coral)+p('M16 26Q17 17 29 20Q42 17 46 29Q49 40 35 44Q22 47 18 38Z',C.paper)+p('M20 28Q26 22 36 26Q45 29 40 37Q33 44 24 38Z',C.coral)+circle(31,32,4,C.cream),
    eggs:p('M9 37H55L50 51H14Z',C.cream)+p('M13 35C13 14 28 10 29 33Q29 43 20 43Q13 43 13 35Z',C.paper)+p('M31 35C31 8 49 9 51 34Q52 44 42 44Q31 44 31 35Z',C.orange)+line(14,47,50,47,C.ink,2),
    fruit:p('M32 22C13 11 7 30 16 45Q24 58 32 49Q44 58 51 40Q59 18 39 20Z',C.coral)+p('M33 20Q34 6 49 11Q45 23 33 20Z',C.mint)+line(32,23,30,13)+p('M18 30Q16 36 20 40','none',`stroke="${C.paper}" stroke-width="3" stroke-linecap="round"`),
    milk:p('M20 9H39L47 21V53H17V21Z',C.paper)+p('M20 9L27 20H47L39 9Z',C.blue)+p('M17 21H27V53H17Z',C.mint)+r(30,28,13,17,C.blue,3)+p('M36 30Q28 40 36 42Q44 40 36 30Z',C.paper),
    phone:r(18,7,28,50,C.ink,6)+r(21,11,22,38,C.blue,3)+p('M21 41L43 19V49H21Z',C.mint)+r(28,12,9,3,C.ink,2)+circle(32,53,2,C.paper),
    gpu:r(8,19,48,28,C.mint,3)+r(8,16,3,36,C.ink)+circle(29,33,11,C.ink)+circle(29,33,4,C.blue)+p('M29 23L33 28L29 29L25 26Z',C.paper)+p('M39 33L34 37L33 33L36 29Z',C.paper)+p('M29 43L25 38L29 37L33 40Z',C.paper)+r(43,24,9,5,C.ink)+r(43,35,9,5,C.ink)+r(18,47,25,4,C.orange),
    console:r(21,7,23,29,C.paper,4)+p('M23 7L30 10V36H23Z',C.blue)+r(34,13,5,18,C.ink,2)+p('M17 33Q9 34 8 48Q7 57 16 52L25 45H39L48 52Q57 57 56 47Q53 31 46 33Z',C.ink)+line(17,38,17,46,C.paper)+line(13,42,21,42,C.paper)+circle(44,40,2,C.coral)+circle(48,44,2,C.orange),
    camera:r(8,21,48,31,C.ink,5)+p('M18 21L22 13H37L42 21Z',C.ink)+circle(33,36,13,C.blue)+circle(33,36,9,C.paper)+circle(33,36,6,C.ink)+circle(30,33,2,C.blue)+r(12,25,7,4,C.orange,1),
    gold:p('M20 18Q32 4 44 18L49 34Q32 61 15 34Z','none',`stroke="${C.orange}" stroke-width="7"`)+p('M24 33L32 23L40 33L32 43Z',C.orange)+p('M24 33H40L32 38Z',C.light)+line(32,23,32,38,C.paper),
    watch:r(24,5,16,54,C.coral,5)+r(21,20,22,25,C.orange,6)+circle(32,32,10,C.paper)+line(32,25,32,32)+line(32,32,38,35)+r(27,8,10,5,C.ink,1),
    collectible:r(12,49,40,7,C.ink,2)+r(17,44,30,5,C.cream)+p('M23 43V26H18L32 10L46 26H41V43Z',C.orange)+r(28,30,8,13,C.ink,2)+circle(32,22,3,C.paper)+line(45,10,45,18,C.mint)+line(41,14,49,14,C.mint),
    coat:p('M23 11L15 16L7 35L16 40L21 29V54H43V29L48 40L57 35L49 16L41 11L32 17Z',C.coral)+p('M23 11L27 7H37L41 11L32 21Z',C.cream)+line(32,21,32,54,C.paper)+line(23,30,41,30,C.orange)+line(23,39,41,39,C.orange)+line(23,48,41,48,C.orange),
    ac:r(6,13,52,25,C.paper,5)+r(10,28,44,6,C.ink,2)+r(45,18,7,3,C.mint,1)+line(14,42,14,51,C.blue)+p('M29 42Q24 48 29 54M43 42Q38 48 43 54','none',`stroke="${C.blue}" stroke-width="3" stroke-linecap="round"`),
    umbrella:p('M7 31Q9 9 32 9Q55 9 57 31Q50 25 44 31Q38 25 32 31Q26 25 20 31Q13 25 7 31Z',C.coral)+p('M20 31Q23 12 32 9Q41 12 44 31Q38 25 32 31Q26 25 20 31Z',C.orange)+p('M32 31V49Q32 59 42 54V49','none',`stroke="${C.ink}" stroke-width="3" stroke-linecap="round"`),
    mask:p('M15 24Q1 17 6 38Q10 46 16 38M49 24Q63 17 58 38Q54 46 48 38','none',`stroke="${C.ink}" stroke-width="2"`)+p('M15 20Q32 27 49 20V41Q32 54 15 41Z',C.blue)+line(21,30,43,30,C.paper)+line(21,36,43,36,C.paper)+line(23,42,41,42,C.paper),
    medicine:r(12,11,28,43,C.paper,4)+r(11,8,30,9,C.mint,2)+r(18,28,16,5,C.coral)+r(24,22,5,17,C.coral)+p('M39 39Q46 29 53 38Q61 44 52 52Q44 60 38 51Q33 46 39 39Z',C.orange)+line(39,39,52,52,C.paper),
    battery:r(14,17,34,37,C.mint,5)+r(23,10,16,7,C.ink,2)+p('M34 22L23 37H31L28 49L41 32H33Z',C.light)+r(18,21,5,4,C.paper,1),
    food:r(9,26,25,29,C.orange,3)+r(9,23,25,5,C.ink,2)+r(12,35,19,11,C.paper,2)+p('M19 39L25 39L22 44Z',C.mint)+p('M37 10H52L55 54H34Z',C.cream)+r(38,24,13,20,C.mint,2)+line(38,15,51,15),
    cash:r(7,20,48,29,C.mint,4)+r(10,16,43,27,C.paper,3)+circle(32,30,9,C.orange)+line(32,24,32,36,C.paper)+line(27,28,37,28,C.paper)+line(27,32,37,32,C.paper),
    assets:r(10,36,10,17,C.mint,2)+r(27,25,10,28,C.blue,2)+r(44,11,10,42,C.orange,2)+p('M10 27L29 14L38 19L53 6','none',`stroke="${C.ink}" stroke-width="3"`),
    warehouse:p('M7 27L32 9L57 27V53H7Z',C.mint)+r(17,30,30,23,C.paper,2)+line(20,37,44,37)+line(20,43,44,43)+p('M5 27L32 7L59 27','none',`stroke="${C.ink}" stroke-width="4"`),
    home:p('M12 29L32 12L52 29V54H12Z',C.paper)+p('M7 29L32 8L57 29','none',`stroke="${C.coral}" stroke-width="6" stroke-linejoin="round"`)+r(27,35,12,19,C.mint,2)+r(16,32,8,9,C.orange,1),
    news:r(10,12,39,42,C.paper,3)+p('M49 21H55V49Q55 54 49 54Z',C.mint)+r(16,19,26,5,C.ink,1)+r(16,29,11,13,C.coral,1)+line(32,30,43,30)+line(32,37,43,37)+line(16,47,43,47),
    calendar:r(10,13,44,42,C.paper,4)+r(10,13,44,12,C.coral,4)+line(22,9,22,18)+line(42,9,42,18)+r(18,31,7,7,C.mint,1)+r(29,31,7,7,C.orange,1)+r(40,31,7,7,C.mint,1)+r(18,42,7,7,C.mint,1)+r(29,42,7,7,C.mint,1),
    sound:p('M10 25H21L36 13V51L21 39H10Z',C.mint)+p('M43 22Q55 32 43 42M48 14Q66 32 48 50','none',`stroke="${C.ink}" stroke-width="3" stroke-linecap="round"`),
    settings:p('M26 7H38L40 16L48 19L56 16L61 27L53 32L52 40L56 48L46 55L39 49L31 50L25 57L15 51L18 42L13 35L5 31L9 20L19 21L24 16Z',C.mint)+circle(33,32,11,C.paper)+circle(33,32,5,C.ink),
    help:circle(32,32,24,C.mint)+p('M24 24Q25 14 35 18Q46 22 37 31L32 35V39','none',`stroke="${C.paper}" stroke-width="4" stroke-linecap="round"`)+circle(32,46,2.5,C.paper),
    buy:r(9,34,46,20,C.mint,4)+p('M32 8V39M21 28L32 39L43 28','none',`stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`),
    sell:r(9,34,46,20,C.orange,4)+p('M32 39V8M21 19L32 8L43 19','none',`stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`),
    arrow:p('M10 32H53M36 15L53 32L36 49','none',`stroke="${C.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`),
    close:p('M17 17L47 47M47 17L17 47','none',`stroke="${C.ink}" stroke-width="4" stroke-linecap="round"`),
    star:p('M32 7L39 23L57 25L44 38L47 56L32 47L17 56L20 38L7 25L25 23Z',C.orange),
    search:circle(27,27,17,C.paper)+`<circle cx="27" cy="27" r="17" fill="none" stroke="${C.ink}" stroke-width="4"/>`+line(40,40,55,55,C.ink,5)
  };
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function svg(body, box, cls='') { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" class="${escape(cls)}" aria-hidden="true" focusable="false">${body}</svg>`; }
  function windowPane(x,y,w=22,h=30) { return r(x+2,y+2,w,h,C.ink,2)+r(x,y,w,h,C.light,2)+line(x+w/2,y,x+w/2,y+h,C.cream,2)+line(x,y+h/2,x+w,y+h/2,C.cream,2); }
  function plant(x,y,s=1) { return `<g transform="translate(${x} ${y}) scale(${s})">${r(-8,0,16,16,C.coral,2)}${line(0,0,0,-23,C.ink,2)}${p('M0 -7Q-23 -5 -19 -22Q-3 -23 0 -7Z',C.mint)}${p('M0 -15Q2 -34 19 -29Q23 -15 0 -15Z',C.mint)}</g>`; }
  function tree(x,y,s=1) { return `<g transform="translate(${x} ${y}) scale(${s})">${r(-5,-42,10,48,C.ink,2)}${circle(-14,-54,24,C.mint)}${circle(12,-64,30,C.mint)}${circle(27,-47,20,C.mint)}${line(0,-40,15,-58,C.ink,2)}</g>`; }
  function person(x,y,color=C.coral,s=1) { return `<g transform="translate(${x} ${y}) scale(${s})">${circle(0,-39,6,C.orange)}${p('M-7 -30Q0 -34 7 -30L10 -10H-10Z',color)}${line(-4,-10,-6,8,C.ink,3)}${line(5,-10,9,8,C.ink,3)}${line(-7,-26,-15,-13,C.ink,3)}${line(7,-26,16,-19,C.ink,3)}${r(11,-20,11,13,C.orange,2)}</g>`; }
  function backdrop(w=480,h=300) { return r(0,0,w,h,C.paper)+circle(w*.79,h*.25,h*.14,C.light)+p(`M0 ${h*.63}Q${w*.2} ${h*.53} ${w*.4} ${h*.63}T${w} ${h*.59}V${h}H0Z`,C.cream); }
  function house(level) {
    let b=backdrop();
    b+=p('M0 263Q210 245 480 263V300H0Z','#d7ddca')+r(0,277,480,23,C.cream)+line(0,279,480,279,C.paper,3);
    if(level===0) {
      b+=r(112,105,239,161,'#e4c6ae',3)+p('M103 107L126 78H341L359 107Z',C.ink)+r(126,115,211,7,C.coral)+r(143,172,48,94,C.ink,3)+r(147,177,39,89,C.mint,2)+circle(178,225,3,C.orange)+windowPane(216,144,45,57)+windowPane(281,144,37,57)+r(212,201,53,6,C.coral)+r(275,201,49,6,C.coral)+r(138,263,65,8,C.paper)+line(125,132,148,132,C.cream,3)+line(318,243,337,243,C.paper,3)+plant(308,247,1.1)+r(111,247,17,19,C.ink,2);
    } else if(level===1) {
      b+=r(126,72,229,194,C.paper,3)+p('M118 74L134 56H348L363 74Z',C.ink)+r(126,75,45,191,C.blue)+windowPane(139,96,20,34)+windowPane(190,96,38,41)+windowPane(263,96,38,41)+windowPane(190,170,38,41)+windowPane(263,170,38,41)+r(182,138,132,7,C.coral)+r(180,144,136,19,C.mint)+line(190,145,190,161,C.paper)+line(215,145,215,161,C.paper)+line(241,145,241,161,C.paper)+line(266,145,266,161,C.paper)+line(294,145,294,161,C.paper)+r(230,225,36,41,C.ink,2)+r(235,228,26,38,C.orange,1)+plant(321,250,.9)+plant(195,139,.65);
    } else if(level===2) {
      b+=r(99,117,275,148,C.paper,3)+r(137,75,198,66,C.cream)+p('M85 120L135 77L205 120Z',C.coral)+p('M202 120L335 76L385 120Z',C.ink)+windowPane(125,151,47,52)+windowPane(287,151,52,52)+windowPane(209,92,36,28)+r(205,165,50,100,C.mint,3)+r(213,178,34,38,C.light,2)+circle(245,229,3,C.orange)+r(186,263,86,8,C.cream)+plant(112,248,.9)+plant(357,248,1.2)+r(277,208,71,6,C.coral)+line(124,218,171,218,C.cream,3);
    } else if(level===3) {
      b+=r(96,71,286,195,C.paper,3)+r(96,71,70,195,C.blue)+r(165,71,217,12,C.ink)+r(177,84,190,12,C.coral)+windowPane(112,94,37,52)+windowPane(112,171,37,51);
      for(let y=104;y<=174;y+=70) { for(let x=187;x<=313;x+=63) b+=windowPane(x,y,38,42); b+=r(178,y+42,184,7,C.ink)+r(178,y+49,184,15,C.mint); for(let x=185;x<360;x+=20) b+=line(x,y+49,x,y+63,C.paper,2); b+=plant(340,y+42,.55); }
      b+=r(244,239,41,27,C.ink,2)+r(250,241,29,25,C.orange,1)+r(95,65,287,7,C.cream);
    } else {
      b+=r(105,142,283,122,C.paper,3)+r(195,83,164,181,C.paper,3)+r(181,72,194,15,C.ink)+r(91,131,184,14,C.ink)+r(112,158,77,63,C.blue,2)+line(150,158,150,221,C.paper,3)+windowPane(221,105,53,54)+windowPane(293,105,40,54)+r(208,162,139,6,C.coral)+r(210,168,137,19,C.mint)+line(225,169,225,185,C.paper)+line(253,169,253,185,C.paper)+line(281,169,281,185,C.paper)+line(311,169,311,185,C.paper)+r(236,210,49,54,C.ink,2)+r(242,215,37,49,C.orange,2)+windowPane(310,211,46,34)+r(118,233,63,7,C.coral)+plant(324,162,.75)+plant(165,129,.65)+plant(375,246,1.15)+p('M59 268L60 221Q60 202 76 204Q91 204 91 223V268Z',C.mint)+line(65,229,85,229,C.paper)+line(65,243,85,243,C.paper)+p('M271 272L307 300H197L231 272Z',C.paper);
    }
    b+=tree(48,265,.8)+tree(430,265,1.05)+circle(397,273,7,C.mint)+circle(87,269,5,C.orange)+person(75,274,C.coral,.57);
    return svg(b,'0 0 480 300','art-scene art-house');
  }
  function city() {
    let b=r(0,0,1000,620,C.paper)+circle(807,123,72,C.light)+p('M0 191Q105 152 184 190T384 178T589 184T789 170T1000 189V353H0Z','#e8dfce');
    // Quiet skyline behind the lived-in foreground neighborhood.
    [[23,159,73,232],[120,112,67,279],[205,173,94,218],[328,90,65,301],[417,135,110,256],[569,166,85,225],[694,119,70,272],[790,153,106,238],[920,122,80,269]].forEach((a,i)=>{ b+=r(...a,i%2?'#b7c7bf':'#cbd2c4',3); for(let y=a[1]+17;y<350;y+=30)for(let x=a[0]+13;x<a[0]+a[2]-9;x+=22)b+=r(x,y,8,13,C.paper,1); });
    b+=p('M0 426Q402 395 1000 413V620H0Z',C.cream)+p('M0 515L1000 455V558L0 618Z','#708b89')+line(20,578,960,518,C.paper,3)+r(0,429,1000,14,'#d3c7af');
    b+=r(63,231,206,199,C.paper,3)+p('M49 233L78 193H252L280 233Z',C.coral)+r(76,243,11,187,C.cream);
    for(let x=102;x<242;x+=55) b+=windowPane(x,257,33,44)+windowPane(x,322,33,42);
    b+=r(94,375,150,54,C.ink,2)+r(101,380,46,47,C.light,2)+r(159,380,77,47,C.blue,2)+p('M87 375L100 358H238L251 375Z',C.orange);
    for(let x=96;x<245;x+=24)b+=r(x,361,12,14,C.paper);
    b+=r(317,182,201,240,C.cream,3)+r(303,177,228,14,C.ink,2)+r(330,197,174,7,C.coral);
    for(let y=218;y<350;y+=65){ for(let x=342;x<500;x+=58)b+=windowPane(x,y,32,39); b+=r(332,y+39,173,6,C.coral)+r(332,y+45,173,12,C.mint); }
    b+=r(374,365,42,57,C.ink,2)+r(382,374,26,48,C.orange)+r(437,371,60,37,C.light,2)+plant(488,347,.75);
    b+=r(575,255,210,162,C.paper,3)+p('M558 258L596 216H757L799 258Z',C.ink)+r(591,270,178,9,C.orange);
    for(let x=594;x<765;x+=54)b+=windowPane(x,297,32,42);
    b+=r(595,364,169,54,C.mint,3)+r(604,370,74,47,C.light,2)+r(691,370,63,47,C.ink,2)+line(639,370,639,416,C.cream,3)+plant(765,400,.9);
    b+=r(825,201,149,217,C.coral,3)+p('M812 201L835 178H961L987 201Z',C.ink)+r(837,211,123,9,C.cream);
    for(let y=237;y<350;y+=58)for(let x=843;x<963;x+=46)b+=windowPane(x,y,27,36);
    b+=r(864,369,45,49,C.ink,2)+r(870,375,33,43,C.orange);
    b+=tree(31,444,1.7)+tree(548,430,1.4)+tree(801,428,1.1)+tree(971,460,1.7)+plant(278,421,1.25)+plant(318,420,.95);
    // Street furniture, bicycle, café tables and neighbors.
    b+=r(234,443,98,9,C.coral,3)+r(241,452,6,20,C.ink)+r(319,452,6,20,C.ink)+r(234,423,98,14,C.coral,3)+line(241,437,241,444)+line(323,437,323,444);
    b+=line(726,351,726,450,C.ink,4)+p('M708 354Q726 324 744 354Z',C.ink)+circle(726,352,9,C.light)+circle(851,461,21,C.ink)+circle(901,461,21,C.ink)+circle(851,461,17,C.cream)+circle(901,461,17,C.cream)+p('M851 461L869 429L884 461H851L881 438L901 461','none',`stroke="${C.coral}" stroke-width="4" stroke-linejoin="round"`)+line(868,429,879,429,C.ink,3)+line(881,438,887,425,C.ink,3)+line(887,425,898,425,C.ink,3);
    b+=r(617,434,45,6,C.orange,3)+line(639,440,639,465,C.ink,3)+r(596,440,13,5,C.mint,2)+line(602,445,602,465)+r(675,440,13,5,C.mint,2)+line(681,445,681,465)+r(631,425,8,9,C.paper,2);
    b+=person(179,458,C.mint,.95)+person(448,444,C.coral,.83)+person(478,446,C.blue,.65)+person(756,471,C.orange,.95)+person(356,528,C.coral,1.05);
    b+=p('M401 550Q440 545 468 551L459 566H407Z',C.orange)+circle(414,568,5,C.ink)+circle(453,568,5,C.ink)+line(406,548,393,535,C.ink,3)+circle(890,67,3,C.coral)+p('M681 77Q689 70 698 77M698 77Q707 70 715 77','none',`stroke="${C.ink}" stroke-width="2" stroke-linecap="round"`);
    return svg(b,'0 0 1000 620','art-scene art-city');
  }
  function warehouse() {
    let b=backdrop()+r(0,264,480,36,C.cream)+tree(47,266,.8)+p('M93 122L240 53L391 122V265H93Z',C.mint)+p('M79 126L240 47L407 126L401 135L240 62L85 135Z',C.ink)+r(112,139,259,14,C.paper)+r(168,164,143,101,C.ink,3)+r(174,169,131,49,C.cream);
    for(let y=177;y<218;y+=10)b+=line(179,y,300,y,C.paper,2);
    b+=r(120,176,31,39,C.light,2)+line(135,176,135,215,C.cream,2)+r(332,176,25,70,C.paper,2)+r(337,182,15,29,C.blue,1)+circle(350,224,2,C.orange);
    [[184,234,36,30],[223,228,37,36],[264,241,29,23],[218,204,30,23],[107,237,34,28]].forEach(a=>{b+=r(...a,C.orange,2)+r(a[0]+a[2]*.44,a[1],a[2]*.14,a[3],C.paper)+line(a[0]+5,a[1]+a[3]-6,a[0]+12,a[1]+a[3]-6,C.ink,2);});
    b+=r(159,264,160,7,C.coral)+plant(381,248,1)+person(409,270,C.coral,.75)+r(47,267,47,5,C.ink,2)+circle(55,277,5,C.ink)+circle(84,277,5,C.ink)+line(90,267,103,230,C.ink,3)+r(50,244,32,22,C.orange,2);
    return svg(b,'0 0 480 300','art-scene art-warehouse');
  }
  const scenes = {city:city(),warehouse:warehouse()};
  for(let n=0;n<5;n++) scenes['house-'+n]=house(n);
  const houseIds=['studio','flat','two','city','dream'];
  const aliases={room:'warehouse',small:'warehouse',normal:'warehouse',large:'warehouse',music:'sound',next:'arrow',inventory:'warehouse',chart:'assets',profit:'assets',coin:'cash'};
  H.Art = Object.freeze({
    palette:Object.freeze(C),
    icon(id,className='') { const key=aliases[id] || (houseIds.includes(id)?'home':id); return svg(icons[key] || icons.home,'0 0 64 64','art-icon'+(className?' '+className:'')); },
    scene(kind) { if(houseIds.includes(kind) && kind!=='city') kind='house-'+houseIds.indexOf(kind); return scenes[kind] || scenes.city; },
    iconIds:Object.freeze(Object.keys(icons)), sceneIds:Object.freeze(Object.keys(scenes))
  });
})(window);
