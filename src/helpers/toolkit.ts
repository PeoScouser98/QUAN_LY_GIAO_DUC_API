import createHttpError from 'http-errors';

// so sánh 2 obj có bằng nhau không
export const compareObject = (obj1: any, obj2: any) => {
	const obj1Keys: string[] = sortArrayByLetter(Object.keys(obj1));
	const obj2Keys: string[] = sortArrayByLetter(Object.keys(obj2));

	if (obj1Keys.length !== obj2Keys.length) {
		return false;
	}

	const checkValue = obj1Keys.reduce(
		(accumulator, currentValue) =>
			accumulator &&
			obj2Keys.includes(currentValue) &&
			obj2[currentValue] === obj1[currentValue],
		true
	);

	return checkValue;
};

export function sortArrayByLetter(array: string[]): string[] {
	return array.sort(function (a, b) {
		if (a < b) {
			return -1;
		} else if (a > b) {
			return 1;
		} else {
			return 0;
		}
	});
}

// tạo ra 1 bảng chỉ chứa 1 thuộc tính xác định từ array gốc
export function getPropertieOfArray(array: any, propertie: string) {
	return array.map((item: any) => {
		if (!item[propertie]) {
			throw createHttpError.BadGateway(`Propertie ${propertie} does not exist in data`);
		}
		return item[propertie];
	});
}

// loại bỏ dấu
export function createSlug(str: string): string {
	str = str.toLowerCase().trim();

	str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
	str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
	str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
	str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
	str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
	str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
	str = str.replace(/đ/g, 'd');
	str = str.replace(/\s+/g, '-');

	return str;
}

// tạo ra 1 mã học sinh của trường
export function generateStudentID(name: string, phoneNumber: string): string {
	// Tách các từ trong tên học sinh thành mảng các chuỗi con
	const nameParts = createSlug(name).split('-');

	// Lấy chữ cái đầu tiên của họ và tên đệm
	const lastNameInitial = nameParts[0].charAt(0);
	const middleNameInitial = nameParts
		.map((item, index) => {
			if (index === 0 || index === nameParts.length - 1) {
				return undefined;
			}
			return item.charAt(0);
		})
		.join('')
		.toLowerCase();

	// Lấy 4 ký tự cuối của số điện thoại phụ huynh
	const phoneNumberSuffix = phoneNumber.slice(-4);

	// Ghép các phần tử lại để tạo ra mã số học sinh
	const studentID =
		nameParts[nameParts.length - 1].toLowerCase() +
		lastNameInitial +
		middleNameInitial +
		'BX' +
		phoneNumberSuffix;

	return studentID;
}
