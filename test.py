#add helper functions here if needed

def parse_and_calculate(expr, digit):
    """Parse an expression and calculate its value with the given digit replacing 'x'."""
    # Replace 'x' with the digit
    expr = expr.replace('x', str(digit))
    
    # Find the operator
    if '+' in expr:
        parts = expr.split('+')
        if len(parts) == 2:
            try:
                return int(parts[0]) + int(parts[1])
            except:
                return None
    elif '-' in expr:
        parts = expr.split('-')
        if len(parts) == 2:
            try:
                return int(parts[0]) - int(parts[1])
            except:
                return None
    elif '*' in expr:
        parts = expr.split('*')
        if len(parts) == 2:
            try:
                return int(parts[0]) * int(parts[1])
            except:
                return None
    
    # If no operator found, try to parse as a single number
    try:
        return int(expr)
    except:
        return None

def missing_digit(equation):
    """ this function will be called by the test runner

        - equation (str): A string representing the equation.

        - desired return value: missing digit (int)

    """
    
    # Split equation into left and right sides
    left, right = equation.split('=')
    
    # Try each digit 0-9 to replace 'x'
    for digit in range(10):
        # Calculate left side value
        left_value = parse_and_calculate(left, digit)
        
        # Calculate right side value
        right_value = parse_and_calculate(right, digit)
        
        # Check if the equation is valid
        if left_value is not None and right_value is not None:
            if left_value == right_value:
                return digit
    
    return 0