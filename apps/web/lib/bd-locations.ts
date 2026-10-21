// ============================================
// Bangladesh Districts + Upazilas
// ============================================

export interface District {
  name: string;
  division: string;
  upazilas: string[];
}

export const BD_DISTRICTS: District[] = [
  // ========== CHATTOGRAM DIVISION ==========
  {
    name: 'Chattogram',
    division: 'Chattogram',
    upazilas: [
      'Anwara', 'Banshkhali', 'Boalkhali', 'Chandanaish', 'Fatikchhari',
      'Hathazari', 'Lohagara', 'Mirsharai', 'Patiya', 'Rangunia',
      'Raozan', 'Sandwip', 'Satkania', 'Sitakunda',
      'Kotwali', 'Pahartali', 'Double Mooring', 'Halishahar', 'Khulshi',
      'Bakalia', 'Bayezid', 'Chandgaon', 'Panchlaish', 'Patenga', 'Karnaphuli',
    ],
  },
  {
    name: "Cox's Bazar",
    division: 'Chattogram',
    upazilas: [
      "Cox's Bazar Sadar", 'Chakaria', 'Ramu', 'Teknaf', 'Ukhiya',
      'Maheshkhali', 'Kutubdia', 'Pekua',
    ],
  },
  {
    name: 'Bandarban',
    division: 'Chattogram',
    upazilas: [
      'Bandarban Sadar', 'Alikadam', 'Naikhongchhari', 'Rowangchhari',
      'Ruma', 'Thanchi', 'Lama',
    ],
  },
  {
    name: 'Rangamati',
    division: 'Chattogram',
    upazilas: [
      'Rangamati Sadar', 'Bagaichhari', 'Barkal', 'Kawkhali', 'Kaptai',
      'Juraichhari', 'Langadu', 'Naniarchar', 'Rajasthali',
    ],
  },
  {
    name: 'Khagrachari',
    division: 'Chattogram',
    upazilas: [
      'Khagrachari Sadar', 'Dighinala', 'Lakshmichhari', 'Mahalchhari',
      'Manikchhari', 'Matiranga', 'Panchhari', 'Ramgarh',
    ],
  },
  {
    name: 'Feni',
    division: 'Chattogram',
    upazilas: [
      'Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Parshuram',
      'Sonagazi', 'Fulgazi',
    ],
  },
  {
    name: 'Noakhali',
    division: 'Chattogram',
    upazilas: [
      'Noakhali Sadar', 'Begumganj', 'Chatkhil', 'Companiganj',
      'Hatiya', 'Senbagh', 'Sonaimuri', 'Subarnachar', 'Kabirhat',
    ],
  },
  {
    name: 'Lakshmipur',
    division: 'Chattogram',
    upazilas: [
      'Lakshmipur Sadar', 'Kamalnagar', 'Raipur', 'Ramganj', 'Ramgati',
    ],
  },
  {
    name: 'Cumilla',
    division: 'Chattogram',
    upazilas: [
      'Cumilla Sadar', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina',
      'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam',
      'Meghna', 'Monohorgonj', 'Muradnagar', 'Nangalkot', 'Titas',
      'Cumilla Sadar Dakshin',
    ],
  },
  {
    name: 'Brahmanbaria',
    division: 'Chattogram',
    upazilas: [
      'Brahmanbaria Sadar', 'Ashuganj', 'Bancharampur', 'Bijoynagar',
      'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail', 'Akhaura',
    ],
  },
  {
    name: 'Chandpur',
    division: 'Chattogram',
    upazilas: [
      'Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua',
      'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti',
    ],
  },

  // ========== DHAKA DIVISION ==========
  {
    name: 'Dhaka',
    division: 'Dhaka',
    upazilas: [
      'Dhamrai', 'Dohar', 'Keraniganj', 'Nawabganj', 'Savar',
      'Dhaka Metro - Gulshan', 'Dhaka Metro - Mirpur', 'Dhaka Metro - Uttara',
      'Dhaka Metro - Dhanmondi', 'Dhaka Metro - Motijheel',
      'Dhaka Metro - Mohammadpur', 'Dhaka Metro - Old Dhaka',
    ],
  },
  {
    name: 'Gazipur',
    division: 'Dhaka',
    upazilas: [
      'Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur',
      'Tongi',
    ],
  },
  {
    name: 'Narayanganj',
    division: 'Dhaka',
    upazilas: [
      'Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon',
      'Siddhirganj', 'Fatullah',
    ],
  },
  {
    name: 'Tangail',
    division: 'Dhaka',
    upazilas: [
      'Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Dhanbari',
      'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur',
      'Nagarpur', 'Sakhipur',
    ],
  },
  {
    name: 'Kishoreganj',
    division: 'Dhaka',
    upazilas: [
      'Kishoreganj Sadar', 'Austagram', 'Bajitpur', 'Bhairab',
      'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kuliarchar',
      'Mithamain', 'Nikli', 'Pakundia', 'Tarail',
    ],
  },
  {
    name: 'Manikganj',
    division: 'Dhaka',
    upazilas: [
      'Manikganj Sadar', 'Daulatpur', 'Ghior', 'Harirampur', 'Saturia',
      'Shibalaya', 'Singair',
    ],
  },
  {
    name: 'Munshiganj',
    division: 'Dhaka',
    upazilas: [
      'Munshiganj Sadar', 'Gazaria', 'Lohajang', 'Sirajdikhan', 'Sreenagar',
      'Tongibari',
    ],
  },
  {
    name: 'Narsingdi',
    division: 'Dhaka',
    upazilas: [
      'Narsingdi Sadar', 'Belabo', 'Monohardi', 'Palash', 'Raipura',
      'Shibpur',
    ],
  },
  {
    name: 'Faridpur',
    division: 'Dhaka',
    upazilas: [
      'Faridpur Sadar', 'Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan',
      'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha',
    ],
  },
  {
    name: 'Madaripur',
    division: 'Dhaka',
    upazilas: [
      'Madaripur Sadar', 'Kalkini', 'Rajoir', 'Shibchar', 'Dasar',
    ],
  },
  {
    name: 'Gopalganj',
    division: 'Dhaka',
    upazilas: [
      'Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara',
    ],
  },
  {
    name: 'Rajbari',
    division: 'Dhaka',
    upazilas: [
      'Rajbari Sadar', 'Baliakandi', 'Goalandaghat', 'Kalukhali', 'Pangsha',
    ],
  },
  {
    name: 'Shariatpur',
    division: 'Dhaka',
    upazilas: [
      'Shariatpur Sadar', 'Bhedarganj', 'Damudya', 'Gosairhat', 'Naria',
      'Zanjira',
    ],
  },

  // ========== SYLHET DIVISION ==========
  {
    name: 'Sylhet',
    division: 'Sylhet',
    upazilas: [
      'Sylhet Sadar', 'Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj',
      'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat',
      'Osmani Nagar', 'Zakiganj',
    ],
  },
  {
    name: 'Moulvibazar',
    division: 'Sylhet',
    upazilas: [
      'Moulvibazar Sadar', 'Barlekha', 'Juri', 'Kamalganj', 'Kulaura',
      'Rajnagar', 'Sreemangal',
    ],
  },
  {
    name: 'Habiganj',
    division: 'Sylhet',
    upazilas: [
      'Habiganj Sadar', 'Ajmiriganj', 'Bahubal', 'Baniyachong', 'Chunarughat',
      'Lakhai', 'Madhabpur', 'Nabiganj', 'Shayestaganj',
    ],
  },
  {
    name: 'Sunamganj',
    division: 'Sylhet',
    upazilas: [
      'Sunamganj Sadar', 'Bishwamvarpur', 'Chhatak', 'Derai', 'Dharampasha',
      'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Sulla', 'Tahirpur',
      'Shantiganj', 'Madhyanagar',
    ],
  },

  // ========== RAJSHAHI DIVISION ==========
  {
    name: 'Rajshahi',
    division: 'Rajshahi',
    upazilas: [
      'Rajshahi Sadar (Boalia)', 'Bagha', 'Bagmara', 'Charghat', 'Durgapur',
      'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Tanore',
    ],
  },
  {
    name: 'Bogura',
    division: 'Rajshahi',
    upazilas: [
      'Bogura Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali',
      'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur',
      'Shibganj', 'Sonatola',
    ],
  },
  {
    name: 'Pabna',
    division: 'Rajshahi',
    upazilas: [
      'Pabna Sadar', 'Atgharia', 'Bera', 'Bhangura', 'Chatmohar',
      'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar',
    ],
  },
  {
    name: 'Sirajganj',
    division: 'Rajshahi',
    upazilas: [
      'Sirajganj Sadar', 'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur',
      'Raiganj', 'Shahjadpur', 'Tarash', 'Ullahpara',
    ],
  },
  {
    name: 'Natore',
    division: 'Rajshahi',
    upazilas: [
      'Natore Sadar', 'Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur',
      'Singra', 'Naldanga',
    ],
  },
  {
    name: 'Naogaon',
    division: 'Rajshahi',
    upazilas: [
      'Naogaon Sadar', 'Atrai', 'Badalgachhi', 'Dhamoirhat', 'Manda',
      'Mahadebpur', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar',
      'Sapahar',
    ],
  },
  {
    name: 'Joypurhat',
    division: 'Rajshahi',
    upazilas: [
      'Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi',
    ],
  },
  {
    name: 'Chapainawabganj',
    division: 'Rajshahi',
    upazilas: [
      'Chapainawabganj Sadar', 'Bholahat', 'Gomastapur', 'Nachole',
      'Shibganj',
    ],
  },

  // ========== KHULNA DIVISION ==========
  {
    name: 'Khulna',
    division: 'Khulna',
    upazilas: [
      'Khulna Sadar', 'Batiaghata', 'Dacope', 'Dumuria', 'Dighalia',
      'Koyra', 'Paikgachha', 'Phultala', 'Rupsa', 'Terokhada',
    ],
  },
  {
    name: 'Jashore',
    division: 'Khulna',
    upazilas: [
      'Jashore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha',
      'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha',
    ],
  },
  {
    name: 'Satkhira',
    division: 'Khulna',
    upazilas: [
      'Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj',
      'Shyamnagar', 'Tala',
    ],
  },
  {
    name: 'Bagerhat',
    division: 'Khulna',
    upazilas: [
      'Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat',
      'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola',
    ],
  },
  {
    name: 'Kushtia',
    division: 'Khulna',
    upazilas: [
      'Kushtia Sadar', 'Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali',
      'Mirpur',
    ],
  },
  {
    name: 'Jhenaidah',
    division: 'Khulna',
    upazilas: [
      'Jhenaidah Sadar', 'Harinakunda', 'Kaliganj', 'Kotchandpur',
      'Maheshpur', 'Shailkupa',
    ],
  },
  {
    name: 'Magura',
    division: 'Khulna',
    upazilas: [
      'Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur',
    ],
  },
  {
    name: 'Meherpur',
    division: 'Khulna',
    upazilas: ['Meherpur Sadar', 'Gangni', 'Mujibnagar'],
  },
  {
    name: 'Narail',
    division: 'Khulna',
    upazilas: ['Narail Sadar', 'Kalia', 'Lohagara'],
  },
  {
    name: 'Chuadanga',
    division: 'Khulna',
    upazilas: [
      'Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar',
    ],
  },

  // ========== BARISHAL DIVISION ==========
  {
    name: 'Barishal',
    division: 'Barishal',
    upazilas: [
      'Barishal Sadar', 'Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara',
      'Gaurnadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur',
    ],
  },
  {
    name: 'Patuakhali',
    division: 'Barishal',
    upazilas: [
      'Patuakhali Sadar', 'Bauphal', 'Dashmina', 'Dumki', 'Galachipa',
      'Kalapara', 'Mirzaganj', 'Rangabali',
    ],
  },
  {
    name: 'Bhola',
    division: 'Barishal',
    upazilas: [
      'Bhola Sadar', 'Borhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan',
      'Manpura', 'Tazumuddin',
    ],
  },
  {
    name: 'Pirojpur',
    division: 'Barishal',
    upazilas: [
      'Pirojpur Sadar', 'Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur',
      'Nesarabad', 'Zianagar',
    ],
  },
  {
    name: 'Barguna',
    division: 'Barishal',
    upazilas: [
      'Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Patharghata', 'Taltali',
    ],
  },
  {
    name: 'Jhalokati',
    division: 'Barishal',
    upazilas: [
      'Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur',
    ],
  },

  // ========== RANGPUR DIVISION ==========
  {
    name: 'Rangpur',
    division: 'Rangpur',
    upazilas: [
      'Rangpur Sadar', 'Badarganj', 'Gangachara', 'Kaunia', 'Mithapukur',
      'Pirgachha', 'Pirganj', 'Taraganj',
    ],
  },
  {
    name: 'Dinajpur',
    division: 'Rangpur',
    upazilas: [
      'Dinajpur Sadar', 'Birampur', 'Birganj', 'Biral', 'Bochaganj',
      'Chirirbandar', 'Phulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole',
      'Khansama', 'Nawabganj', 'Parbatipur',
    ],
  },
  {
    name: 'Kurigram',
    division: 'Rangpur',
    upazilas: [
      'Kurigram Sadar', 'Bhurungamari', 'Char Rajibpur', 'Chilmari',
      'Phulbari', 'Nageshwari', 'Rajarhat', 'Raumari', 'Ulipur',
    ],
  },
  {
    name: 'Gaibandha',
    division: 'Rangpur',
    upazilas: [
      'Gaibandha Sadar', 'Phulchhari', 'Gobindaganj', 'Palashbari',
      'Sadullapur', 'Saghata', 'Sundarganj',
    ],
  },
  {
    name: 'Lalmonirhat',
    division: 'Rangpur',
    upazilas: [
      'Lalmonirhat Sadar', 'Aditmari', 'Hatibandha', 'Kaliganj', 'Patgram',
    ],
  },
  {
    name: 'Nilphamari',
    division: 'Rangpur',
    upazilas: [
      'Nilphamari Sadar', 'Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj',
      'Saidpur',
    ],
  },
  {
    name: 'Panchagarh',
    division: 'Rangpur',
    upazilas: [
      'Panchagarh Sadar', 'Atwari', 'Boda', 'Debiganj', 'Tetulia',
    ],
  },
  {
    name: 'Thakurgaon',
    division: 'Rangpur',
    upazilas: [
      'Thakurgaon Sadar', 'Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail',
    ],
  },

  // ========== MYMENSINGH DIVISION ==========
  {
    name: 'Mymensingh',
    division: 'Mymensingh',
    upazilas: [
      'Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon',
      'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail',
      'Phulpur', 'Tarakanda', 'Trishal',
    ],
  },
  {
    name: 'Jamalpur',
    division: 'Mymensingh',
    upazilas: [
      'Jamalpur Sadar', 'Baksiganj', 'Dewanganj', 'Islampur', 'Madarganj',
      'Melandaha', 'Sarishabari',
    ],
  },
  {
    name: 'Netrokona',
    division: 'Mymensingh',
    upazilas: [
      'Netrokona Sadar', 'Atpara', 'Barhatta', 'Durgapur', 'Kalmakanda',
      'Kendua', 'Madan', 'Mohanganj', 'Purbadhala', 'Khaliajuri',
    ],
  },
  {
    name: 'Sherpur',
    division: 'Mymensingh',
    upazilas: [
      'Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebardi',
    ],
  },
];

// ============================================
// Helpers
// ============================================
export function getUpazilas(districtName: string): string[] {
  const district = BD_DISTRICTS.find(
    (d) => d.name.toLowerCase() === districtName.toLowerCase()
  );
  return district?.upazilas ?? [];
}

export function getAllDistrictNames(): string[] {
  return BD_DISTRICTS.map((d) => d.name).sort();
}