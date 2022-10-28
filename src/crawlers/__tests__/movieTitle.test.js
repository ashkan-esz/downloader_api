import {getTitleAndYear} from "../movieTitle.js";

test('test function getTitleAndYear -duplicate movie numbers', () => {
    expect(getTitleAndYear('دانلود فیلم Runway 34 2022 باند 34', '', 'movie')).toStrictEqual({
        title: 'runway 34',
        year: '2022',
    });
    expect(getTitleAndYear('دانلود فیلم District B13 2004 بلوک 13', '', 'movie')).toStrictEqual({
        title: 'district b13',
        year: '2004',
    });
    expect(getTitleAndYear('دانلود فیلم 36th Precinct 2004 محدوه 36', '', 'movie')).toStrictEqual({
        title: '36th precinct',
        year: '2004',
    });
    expect(getTitleAndYear('دانلود فیلم Apartment 143 2011 آپارتمان 143', '', 'movie')).toStrictEqual({
        title: 'apartment 143',
        year: '2011',
    });
    expect(getTitleAndYear('دانلود فیلم Flight 7500 2014 پرواز 7500', '', 'movie')).toStrictEqual({
        title: 'flight 7500',
        year: '2014',
    });
    expect(getTitleAndYear('دانلود فیلم 7500 2019 7500', '', 'movie')).toStrictEqual({
        title: '7500',
        year: '2019',
    });
    expect(getTitleAndYear('دانلود فیلم Conquest 1453 2012 فتح 1453', '', 'movie')).toStrictEqual({
        title: 'conquest 1453',
        year: '2012',
    });
    expect(getTitleAndYear('دانلود فیلم The Legend of 1900 1998 افسانه 1900', '', 'movie')).toStrictEqual({
        title: 'the legend of 1900',
        year: '1998',
    });
    expect(getTitleAndYear('دانلود فیلم 10,000 BC 2008 10000 سال قبل میلاد', '', 'movie')).toStrictEqual({
        title: '10000 bc',
        year: '2008',
    });
    expect(getTitleAndYear('دانلود فیلم 3000 Miles to Graceland 2001 3000 مایل به گریسلند', '', 'movie')).toStrictEqual({
        title: '3000 miles to graceland',
        year: '2001',
    });
    expect(getTitleAndYear('دانلود فیلم 3022 2019 3022', '', 'movie')).toStrictEqual({
        title: '3022',
        year: '2019',
    });
    expect(getTitleAndYear('دانلود فیلم The Good, the Bad and the Ugly 1966 خوب بد زشت 1966', '', 'movie')).toStrictEqual({
        title: 'the good the bad and the ugly',
        year: '1966',
    });
    expect(getTitleAndYear('دانلود فیلم Open 24 Hours 2018 24 ساعته باز', '', 'movie')).toStrictEqual({
        title: 'open 24 hours',
        year: '2018',
    });
    expect(getTitleAndYear('دانلود فیلم 21 پل 2019 21 Bridges', '', 'movie')).toStrictEqual({
        title: '21 bridges',
        year: '2019',
    });
    expect(getTitleAndYear('دانلود فیلم 3000 Miles to Graceland 2001 3000 مایل به گریسلند', '', 'movie')).toStrictEqual({
        title: '3000 miles to graceland',
        year: '2001',
    });
    expect(getTitleAndYear('the hunger games mockingjay part 2 2015 3 2', '', 'movie')).toStrictEqual({
        title: 'the hunger games mockingjay part 2',
        year: '2015',
    });
    expect(getTitleAndYear('دانلود فیلم Kim Ji-young: Born 1982 2019 کیم جی یونگ متولد 1982', '', 'movie')).toStrictEqual({
        title: 'kim ji young born 1982',
        year: '2019',
    });
    expect(getTitleAndYear('دانلود فیلم Fear Street: Part Three – 1666 2021 خیابان ترس 3', '', 'movie')).toStrictEqual({
        title: 'fear street part three 1666',
        year: '',
    });
    expect(getTitleAndYear('دانلود فیلم Fear Street: Part Two – 1978 2021 خیابان ترس قسمت دوم: 1978', '', 'movie')).toStrictEqual({
        title: 'fear street part two 1978',
        year: '2021',
    });
    expect(getTitleAndYear('دانلود فیلم Fear Street: Part One – 1994 2021 خیابان ترس پارت یک: 1994', '', 'movie')).toStrictEqual({
        title: 'fear street part one 1994',
        year: '2021',
    });
    expect(getTitleAndYear('دانلود فیلم 13 Going on 30 2004 رفتن از ۱۳ به ۳۰', '', 'movie')).toStrictEqual({
        title: 'going on 30',
        year: '2004',
    });
    expect(getTitleAndYear('دانلود فیلم Salò, or the 120 Days of Sodom 1975 سالو یا 120 روز در سودوم', '', 'movie')).toStrictEqual({
        title: 'salo or the 120 days of sodom',
        year: '1975',
    });
    expect(getTitleAndYear('دانلود مستند Death to 2020 2020 مرگ به 2020', '', 'movie')).toStrictEqual({
        title: 'death to 2020',
        year: '2020',
    });
    expect(getTitleAndYear('دانلود فیلم Homeschool Musical: Class of 2020 2020', '', 'movie')).toStrictEqual({
        title: 'homeschool musical class of 2020',
        year: '2020',
    });
    expect(getTitleAndYear('دانلود انیمه Mob Psycho 100 موب سایکو 100', '', 'anime_serial')).toStrictEqual({
        title: 'mob psycho',
        year: '',
    });
});


test('test function getTitleAndYear -duplicate words', () => {
    expect(getTitleAndYear('دانلود فیلم PVT CHAT 2020 چت PVT', '', 'movie')).toStrictEqual({
        title: 'pvt chat',
        year: '2020',
    });
    expect(getTitleAndYear('دانلود فیلم Algorithm: BLISS 2020 الگوریتم BLISS', '', 'movie')).toStrictEqual({
        title: 'algorithm bliss',
        year: '2020',
    });
    expect(getTitleAndYear('دانلود فیلم DAU. Natasha 2020 DAU ناتاشا', '', 'movie')).toStrictEqual({
        title: 'dau natasha',
        year: '2020',
    });
    expect(getTitleAndYear('sos survive or sacrifice 2020 sos', '', 'movie')).toStrictEqual({
        title: 'sos survive or sacrifice',
        year: '2020',
    });
});


test('test function getTitleAndYear - th|st', () => {
    expect(getTitleAndYear('دانلود فیلم The 24th 2020 بیست و چهار 24', '', 'movie')).toStrictEqual({
        title: 'the 24th',
        year: '2020',
    });
    expect(getTitleAndYear('دانلود فیلم Paris, 13th District 2021 منطقه 13 پاریس', '', 'movie')).toStrictEqual({
        title: 'paris 13th district',
        year: '2021',
    });
    expect(getTitleAndYear('دانلود فیلم Oslo, August 31st 2011 اسلو، 31 اوت', '', 'movie')).toStrictEqual({
        title: 'oslo august 31st',
        year: '2011',
    });
    expect(getTitleAndYear('دانلود فیلم The Edge of Seventeen 2016 آستانه 17 سالگی', '', 'movie')).toStrictEqual({
        title: 'the edge of seventeen',
        year: '2016',
    });
});


test('test function getTitleAndYear -swapped year and movie number', () => {
    expect(getTitleAndYear('دانلود فیلم The King’s Man 2021 کینگزمن 3 یا مرد پادشاه 3', '', 'movie')).toStrictEqual({
        title: 'the kings man 3',
        year: '2021',
    });
    expect(getTitleAndYear('دانلود فیلم Torpedo 2019 اورانیم 235', '', 'movie')).toStrictEqual({
        title: 'torpedo 235',
        year: '2019',
    });
    expect(getTitleAndYear('دانلود فیلم Debt Collectors 2020 شرخر 2 یا تحصیلدار 2', '', 'movie')).toStrictEqual({
        title: 'debt collectors 2',
        year: '2020',
    });
    expect(getTitleAndYear('دانلود فیلم V/H/S/94 2021 وی اچ اس 94', '', 'movie')).toStrictEqual({
        title: 'v h s 94',
        year: '2021',
    });
    expect(getTitleAndYear('دانلود فیلم Wonder Woman 1984 2020 زن شگفت انگیز', '', 'movie')).toStrictEqual({
        title: 'wonder woman 1984',
        year: '2020',
    });
});


test('test function getTitleAndYear -bad cases', () => {
    expect(getTitleAndYear('دانلود فیلم Weeks Later 2007 28 بیست و هشت هفته بعد', '', 'movie')).toStrictEqual({
        title: '28 weeks later',
        year: '2007',
    });
    expect(getTitleAndYear('دانلود فیلم 5 to 7 2014 5 تا 7', '', 'movie')).toStrictEqual({
        title: '5 to 7',
        year: '2014',
    });
    expect(getTitleAndYear('دانلود فیلم The Taking of Pelham 1 2 3 2009 گرفتن پلهام 123 یا گروگانگیری در قطار پلهام 1 2 3 یا گرفتن قطار پلهام 123', '', 'movie')).toStrictEqual({
        title: 'the taking of pelham 1 2 3',
        year: '2009',
    });
    expect(getTitleAndYear('دانلود فیلم Brick Mansions 2014 Brick Mansions 2014', '', 'movie')).toStrictEqual({
        title: 'brick mansions',
        year: '2014',
    });
    expect(getTitleAndYear('دانلود فیلم بلک چهل و هفت Black 47 2018', '', 'movie')).toStrictEqual({
        title: 'black 47',
        year: '2018',
    });
    expect(getTitleAndYear('دانلود فیلم Pineapple Express 2008  ‎ پاین اپل اکسپرس', '', 'movie')).toStrictEqual({
        title: 'pineapple express',
        year: '2008',
    });
});


test('test function getTitleAndYear', () => {
    expect(getTitleAndYear('دانلود انیمه Sing 2 2021 آواز 2 یا آوازه خوان 2', '', 'movie')).toStrictEqual({
        title: 'sing 2',
        year: '2021',
    });
    expect(getTitleAndYear('دانلود فیلم ۲۰۲۵ The World Enslaved By A Virus 2021', '', 'movie')).toStrictEqual({
        title: '2025 the world enslaved by a virus',
        year: '2021',
    });
    expect(getTitleAndYear('دانلود فیلم District 13: Ultimatum 2009 بلوک ۱۳: اتمام حجت', '', 'movie')).toStrictEqual({
        title: 'district 13 ultimatum',
        year: '2009',
    });
});
